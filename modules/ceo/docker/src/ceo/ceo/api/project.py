import os, logging, requests, json, datetime, zipfile, shutil, csv
import xml.etree.ElementTree as ET

from flask import Response, session, request, redirect, url_for, jsonify, render_template, send_file, abort
from flask_cors import cross_origin

from .. import app
from .. import mongo

import uuid

from ..common.utils import import_sepal_auth, requires_auth, propertiesFileToDict, allowed_file, listToCSVRowString, crc32, getTimestamp
from ..common.fusiontables import getTable, createTable, importTable, deleteTable, FTException, FTNotFoundException

from werkzeug.utils import secure_filename

logger = logging.getLogger(__name__)

PROJECT_TYPE_CEP = 'CEP'
PROJECT_TYPE_TRAINING_DATA = 'TRAINING-DATA'

@app.route('/api/project/<id>', methods=['GET'])
@cross_origin(origins=app.config['CO_ORIGINS'])
@import_sepal_auth
@requires_auth
def projectById(id=None):
    project = mongo.db.projects.find_one({'id': id}, {'_id': False})
    if not project:
        abort(404)
    # fusiontables
    token = session.get('accessToken')
    fusionTableId = project.get('fusionTableId')
    if token and fusionTableId:
        try:
            tableId = getTable(token, fusionTableId)
        except FTNotFoundException:
            project['fusionTableId'] = None
        except FTException:
            pass
    project['recordCount'] = mongo.db.records.find({'project_id': id}).count()
    return jsonify(project), 200

@app.route('/api/project', methods=['GET'])
@cross_origin(origins=app.config['CO_ORIGINS'])
@import_sepal_auth
@requires_auth
def projects():
    excludedFields = {'_id': False, 'codeLists': False, 'plots': False, 'properties': False}
    skip = request.args.get('skip', 0, int)
    limit = request.args.get('limit', 0, int)
    projects = []
    otherProjects = []
    if session.get('is_admin'):
        projects = mongo.db.projects.find({}, excludedFields).sort('upload_datetime', -1).skip(skip).limit(limit)
        #otherProjects = mongo.db.projects.find({'username': { '$ne': session.get('username') }}, excludedFields).sort('upload_datetime', -1).skip(skip).limit(limit)
    else:
        projects = mongo.db.projects.find({'username': session.get('username')}, excludedFields).sort('upload_datetime', -1).skip(skip).limit(limit)
    return jsonify({'count': projects.count(), 'projects': list(projects), 'otherProjects': list(otherProjects)}), 200

@app.route('/api/project/<id>/file', methods=['GET'])
@cross_origin(origins=app.config['CO_ORIGINS'])
@import_sepal_auth
@requires_auth
def projectFileById(id=None):
    project = mongo.db.projects.find_one({'id': id}, {'_id': False})
    filename = project['filename']
    name, ext = os.path.splitext(filename)
    return send_file(os.path.join(app.config['UPLOAD_FOLDER'], filename), mimetype='application/zip', attachment_filename=filename, as_attachment=True)

@app.route('/api/project', methods=['POST'])
@cross_origin(origins=app.config['CO_ORIGINS'])
@import_sepal_auth
@requires_auth
def projectAdd():
    # retrieve project data
    username = session.get('username')
    name = request.form.get('name')
    radius = request.form.get('radius', 30, type=int)
    overlays = getLayersFromRequest(request)
    projectType = request.form.get('projectType')
    # validation
    if not projectType:
        print('Project type not provided')
        return 'KO', 400
    else:
        if projectType == PROJECT_TYPE_CEP:
            if not name:
                return 'KO', 400
        elif projectType == PROJECT_TYPE_TRAINING_DATA:
            if not name or not radius:
                return 'KO', 400
    # define basic project
    project = {
        'id': str(uuid.uuid4()),
        'name': name,
        'type': projectType,
        'username': username,
        'upload_datetime': datetime.datetime.utcnow(),
        'overlays': overlays
    }
    if projectType == PROJECT_TYPE_CEP:
        # check if the post request has the file part
        if 'file' not in request.files:
            print('No file part')
            return 'KO', 400
        file = request.files['file']
        # if user does not select file, browser also submit a empty part without filename
        if file.filename == '':
            print('No selected file')
            return 'KO', 400
        # if the file has the allowed extension
        if file and allowed_file(file.filename, app.config['ALLOWED_EXTENSIONS']):
            result = saveFileFromRequest(file)
            # update project data
            project.update({
                'filename': result[0],
                'codeLists': result[1],
                'properties': result[2],
                'plots': result[3]
            })
        else:
            print('No valid extension')
            return 'KO', 400
    elif projectType == PROJECT_TYPE_TRAINING_DATA:
        codeList = getCodeListFromRequest(request)
        codeLists = [codeList]
        project.update({
            'radius': radius,
            'codeLists': codeLists
        })
    mongo.db.projects.insert(project)
    return redirect(app.config['BASE'])

@app.route('/api/project/<id>', methods=['PUT'])
@cross_origin(origins=app.config['CO_ORIGINS'])
@import_sepal_auth
@requires_auth
def projectModify(id=None):
    project = mongo.db.projects.find_one({'id': id}, {'_id': False})
    if not project:
        return 'Not Found!', 404
    # security check
    if project['username'] != session.get('username') and not session.get('is_admin'):
        return 'Forbidden!', 403
    # retrieve project data
    name = request.form.get('name')
    radius = request.form.get('radius', type=int)
    overlays = getLayersFromRequest(request)
    projectType = project['type']
    # validation
    if not projectType:
        return 'KO', 400
    else:
        if projectType == PROJECT_TYPE_CEP:
            if not name:
                return 'KO', 400
        elif projectType == PROJECT_TYPE_TRAINING_DATA:
            if not name or not radius:
                return 'KO', 400
    # update the project
    project.update({
        'name': name,
        'overlays': overlays,
        'update_datetime': datetime.datetime.utcnow()
    })
    if projectType == PROJECT_TYPE_TRAINING_DATA:
        codeList = getCodeListFromRequest(request)
        codeLists = [codeList]
        project.update({
            'radius': radius,
            'codeLists': codeLists
        })
    mongo.db.projects.update({'id': id}, {'$set': project}, upsert=False)
    return 'OK', 200

@app.route('/api/project/<id>', methods=['PATCH'])
@cross_origin(origins=app.config['CO_ORIGINS'])
@import_sepal_auth
@requires_auth
def projectChange(id=None):
    project = mongo.db.projects.find_one({'id': id}, {'_id': False})
    if not project:
        return 'Not Found!', 404
    # security check
    if project['username'] != session.get('username') and not session.get('is_admin'):
        return 'Forbidden!', 403
    # retrieve project data
    plots = request.json.get('plots')
    # update the project
    projectType = project['type']
    if projectType == PROJECT_TYPE_TRAINING_DATA:
        project.update({
            'plots': plots
        })
    mongo.db.projects.update({'id': id}, {'$set': project}, upsert=False)
    return 'OK', 200

@app.route('/api/project/<id>', methods=['DELETE'])
@cross_origin(origins=app.config['CO_ORIGINS'])
@import_sepal_auth
@requires_auth
def projectDelete(id=None):
    project = mongo.db.projects.find_one({'id': id}, {'_id': False})
    if not project:
        return 'Not Found!', 404
    # security check
    if project['username'] != session.get('username') and not session.get('is_admin'):
        return 'Forbidden!', 403
    token = session.get('accessToken')
    fusionTableId = project.get('fusionTableId')
    if fusionTableId:
        try:
            deleteTable(token, fusionTableId)
        except FTException:
            pass
    mongo.db.projects.delete_one({'id': id})
    mongo.db.records.delete_many({'project_id': id})
    if project['type'] == PROJECT_TYPE_CEP:
        filename = project['filename']
        toDelete = mongo.db.projects.find({'filename': filename}).count() == 0
        if toDelete:
            if os.path.isfile(os.path.join(app.config['UPLOAD_FOLDER'], filename)):
                os.remove(os.path.join(app.config['UPLOAD_FOLDER'], filename))
            name, ext = os.path.splitext(filename)
            if os.path.exists(os.path.join(app.config['UPLOAD_FOLDER'], name)):
                shutil.rmtree(os.path.join(app.config['UPLOAD_FOLDER'], name))
    return 'OK', 200

@app.route("/api/project/<id>/export", methods=['GET'])
@cross_origin(origins=app.config['CO_ORIGINS'])
@import_sepal_auth
@requires_auth
def projectExport(id=None):
    project = mongo.db.projects.find_one({'id': id}, {'_id': False})
    username = session.get('username')
    records = list(mongo.db.records.find({'project_id': id, 'username': username}, {'_id': False}))
    #
    exportType = request.args.get('type')
    if exportType == 'fusiontables':
        ft = projectToFusionTables(project)
        token = session.get('accessToken')
        try:
            tableId = createTable(token, ft)
            if tableId:
                csvString = projectToCsv(project, records, withHeader=False, withFtLocation=True)
                isImported = importTable(token, tableId, csvString) if csvString != '' else True
                if isImported:
                    project['fusionTableId'] = tableId
                    mongo.db.projects.update({'id': id}, {'$set': project}, upsert=False)
                    return jsonify({'fusionTableId': tableId}), 200
        except FTException as e:
            return jsonify(str(e)), 500
    else:
        filename = project['name'] + '-' + getTimestamp()
        csvString = projectToCsv(project, records)
        headers = {'Content-disposition': 'attachment; filename=' + filename + '.csv'}
        return Response(csvString, mimetype='text/csv', headers=headers)

def projectToCsv(project, records, withHeader=True, withFtLocation=False):
    csvString = ''
    #
    codeListNames = []
    for codeList in project['codeLists']:
        codeListNames.append(codeList['name'])
    projectType = project['type']
    if projectType == PROJECT_TYPE_CEP:
        if 'confidence' not in codeListNames:
            codeListNames.append('confidence')
        objs = project['plots'][0].get('values')
        if objs:
            if withHeader:
                csvHeaderData = [o['key'] for o in objs] + codeListNames
                csvString = listToCSVRowString(csvHeaderData)
            for plot in project['plots']:
                csvRowData = [o['value'] for o in plot['values']]
                hasRecord = False;
                for record in records:
                    if record.get('plot'):
                        if record.get('plot').get('id') == plot['id']:
                            hasRecord = True
                            values = record['value']
                            for codeListName in codeListNames:
                                value = values.get(codeListName, '')
                                csvRowData.append(value)
                if not hasRecord:
                    for codeListName in codeListNames:
                        csvRowData.append('')
                if withFtLocation:
                    csvRowData.append('%s %s' % (plot['values'][1]['value'], plot['values'][2]['value']))
                csvString += listToCSVRowString(csvRowData)
        else:
            if withHeader:
                csvHeaderData = ['id', 'YCoordinate', 'XCoordinate'] + codeListNames
                csvString = listToCSVRowString(csvHeaderData)
            for record in records:
                csvRowData = [
                    record.get('plot').get('id'),
                    record.get('plot').get('YCoordinate'),
                    record.get('plot').get('XCoordinate')
                ]
                for codeListName in codeListNames:
                    value = record.get('value').get(codeListName, '')
                    csvRowData.append(value)
                if withFtLocation:
                    csvRowData.append('%s %s' % (record.get('plot').get('YCoordinate'), record.get('plot').get('XCoordinate')))
                csvString += listToCSVRowString(csvRowData)
    if projectType == PROJECT_TYPE_TRAINING_DATA:
        if withHeader:
            csvHeaderData = ['id', 'YCoordinate', 'XCoordinate'] + codeListNames
            csvString = listToCSVRowString(csvHeaderData)
        for record in records:
            csvRowData = [
                record.get('plot').get('id'),
                record.get('plot').get('YCoordinate'),
                record.get('plot').get('XCoordinate')
            ]
            for codeListName in codeListNames:
                value = record.get('value').get(codeListName, '')
                csvRowData.append(value)
            if withFtLocation:
                csvRowData.append('%s %s' % (record.get('plot').get('YCoordinate'), record.get('plot').get('XCoordinate')))
            csvString += listToCSVRowString(csvRowData)
    return csvString

def projectToFusionTables(project):
    ft = {
        'name': project['name'] + '-' + getTimestamp(),
        'columns': [],
        'isExportable': False
    }
    #
    codeListNames = [codeList['name'] for codeList in project['codeLists']]
    colNames = []
    projectType = project['type']
    if projectType == PROJECT_TYPE_CEP:
        if 'confidence' not in codeListNames:
            codeListNames.append('confidence')
        objs = project['plots'][0].get('values')
        if objs:
            colNames = [o['key'] for o in objs] + codeListNames
        else:
            colNames = ['id', 'YCoordinate', 'XCoordinate'] + codeListNames
    elif projectType == PROJECT_TYPE_TRAINING_DATA:
        colNames = ['id', 'YCoordinate', 'XCoordinate'] + codeListNames
    for index, colName in enumerate(colNames):
        colType = 'NUMBER' if colName == 'class' else 'STRING'
        ft['columns'].append({
            'columnId': index,
            'name': colName,
            'type': colType
        })
    ft['columns'].append({
        'columnId': len(colNames),
        'name': 'Location',
        'type': 'LOCATION'
    })
    return ft

def saveFileFromRequest(file):
    # project file
    filename = secure_filename(file.filename)
    name, ext = os.path.splitext(filename)
    uniqueName = name + '--' + crc32(file)
    uniqueFilename =  uniqueName + ext
    extractDir = os.path.join(app.config['UPLOAD_FOLDER'], uniqueName)
    if not os.path.isfile(os.path.join(app.config['UPLOAD_FOLDER'], uniqueFilename)):
        # save the file
        file.save(os.path.join(app.config['UPLOAD_FOLDER'], uniqueFilename))
        # extract the files
        if not os.path.exists(extractDir):
            os.mkdir(extractDir)
            zip_ref = zipfile.ZipFile(os.path.join(app.config['UPLOAD_FOLDER'], uniqueFilename), 'r')
            zip_ref.extractall(extractDir)
            zip_ref.close()
    # codeLists
    codeLists = []
    if os.path.isfile(os.path.join(extractDir, 'placemark.idm.xml')):
        ns = {
            'of': 'http://www.openforis.org/idml/3.0'
        }
        tree = ET.parse(os.path.join(extractDir, 'placemark.idm.xml'))
        lists = tree.findall('of:codeLists/of:list', ns)
        disallowedNames = ('id', 'confidence')
        for lst in lists:
            codeList = {
                'id': lst.attrib.get('id'),
                'name': lst.attrib.get('name'),
                'items': []
            }
            if codeList['name'] not in disallowedNames:
                items = lst.findall('of:items/of:item', ns)
                if len(items) > 0:
                    for item in items:
                        codeList.get('items').append({
                            'code': item.find('of:code', ns).text,
                            'label': item.find('of:label', ns).text
                        })
                    codeLists.append(codeList)
    # properties
    propertiesFileFullPath = os.path.join(extractDir, 'project_definition.properties')
    properties = propertiesFileToDict(propertiesFileFullPath)
    # plots
    plots = []
    csvProperty = properties.get('csv', 'test_plots.ced')
    csvFilePath = csvProperty.replace('${project_path}/', '')
    csvFileFullPath = os.path.join(extractDir, csvFilePath)
    if os.path.isfile(csvFileFullPath):
        with open(csvFileFullPath, 'rb') as csvfile:
            csvreader = csv.DictReader(csvfile, delimiter=',', quotechar='"')
            fieldnames = csvreader.fieldnames
            for row in csvreader:
                plot = {
                    'id': row[fieldnames[0]],
                    'YCoordinate': row[fieldnames[1]],
                    'XCoordinate': row[fieldnames[2]],
                    'values': []
                }
                for fieldname in fieldnames:
                    plot['values'].append({
                        'key': fieldname,
                        'value': row[fieldname]
                    })
                plots.append(plot)
    return (uniqueFilename, codeLists, properties, plots)

def getLayersFromRequest(request):
    overlays = []
    layerType = request.form.getlist('layerType[]')
    layerName = request.form.getlist('layerName[]')
    # gee (google earth engine)
    collectionName = request.form.getlist('collectionName[]')
    dateFrom = request.form.getlist('dateFrom[]')
    dateTo = request.form.getlist('dateTo[]')
    visParams = request.form.getlist('visParams[]')
    Min = request.form.getlist('min[]')
    Max = request.form.getlist('max[]')
    band1 = request.form.getlist('band1[]')
    band2 = request.form.getlist('band2[]')
    band3 = request.form.getlist('band3[]')
    gamma = request.form.getlist('gamma[]')
    palette = request.form.getlist('palette[]')
    # digitalglobe
    mapID = request.form.getlist('mapID[]')
    # gibs
    imageryLayer = request.form.getlist('imageryLayer[]')
    date = request.form.getlist('date[]')
    # geonetwork
    geonetworkLayer = request.form.getlist('geonetworkLayer[]')
    # dgcs
    dgcsAcquisitionDateFrom = request.form.getlist('dgcsAcquisitionDateFrom[]')
    dgcsAcquisitionDateTo = request.form.getlist('dgcsAcquisitionDateTo[]')
    dgcsCloudCover = request.form.getlist('dgcsCloudCover[]')
    dgcsProductType = request.form.getlist('dgcsProductType[]')
    dgcsStackingProfile = request.form.getlist('dgcsStackingProfile[]')
    # planet
    planetMosaicName = request.form.getlist('planetMosaicName[]')
    # sepal
    sepalMosaicName = request.form.getlist('sepalMosaicName[]')
    sepalBands = request.form.getlist('sepalBands[]')
    sepalPansharpening = request.form.getlist('sepalPansharpening[]')
    # geoserver
    geoserverUrl = request.form.getlist('geoserverUrl[]')
    geoserverLayers = request.form.getlist('geoserverLayers[]')
    geoserverService = request.form.getlist('geoserverService[]')
    geoserverVersion = request.form.getlist('geoserverVersion[]')
    geoserverFormat = request.form.getlist('geoserverFormat[]')
    # geea (google earth engine assets)
    geeaImageName = request.form.getlist('geeaImageName[]')
    geeaMin = request.form.getlist('geeaMin[]')
    geeaMax = request.form.getlist('geeaMax[]')
    geeaBands = request.form.getlist('geeaBands[]')
    geeaGamma = request.form.getlist('geeaGamma[]')
    geeaPalette = request.form.getlist('geeaPalette[]')
    #
    i1 = i2 = i3 = i4 = i5 = i6 = i7 = i8 = i9 = -1
    for i in range(0, len(layerType)):
        overlay = None
        if layerType[i] == 'gee-gateway':
            i1 += 1
            overlay = {
                'collectionName': collectionName[i1],
                'dateFrom': dateFrom[i1],
                'dateTo': dateTo[i1],
                'visParams': visParams[i1],
                'min': Min[i1],
                'max': Max[i1],
                'band1': band1[i1],
                'band2': band2[i1],
                'band3': band3[i1],
                'gamma': gamma[i1],
                'palette': palette[i1]
            }
        elif layerType[i] == 'digitalglobe':
            i2 += 1
            overlay = {
                'mapID': mapID[i2]
            }
        elif layerType[i] == 'gibs':
            i3 += 1
            overlay = {
                'imageryLayer': imageryLayer[i3],
                'date': date[i3]
            }
        elif layerType[i] == 'geonetwork':
            i4 += 1
            overlay = {
                'geonetworkLayer': geonetworkLayer[i4]
            }
        elif layerType[i] == 'dgcs':
            i5 += 1
            overlay = {
                'dgcsAcquisitionDateFrom': dgcsAcquisitionDateFrom[i5],
                'dgcsAcquisitionDateTo': dgcsAcquisitionDateTo[i5],
                'dgcsCloudCover': dgcsCloudCover[i5],
                'dgcsProductType': dgcsProductType[i5],
                'dgcsStackingProfile': dgcsStackingProfile[i5]
            }
        elif layerType[i] == 'planet':
            i6 += 1
            overlay = {
                'planetMosaicName': planetMosaicName[i6]
            }
        elif layerType[i] == 'sepal':
            i7 += 1
            overlay = {
                'sepalMosaicName': sepalMosaicName[i7],
                'sepalBands': sepalBands[i7],
                'sepalPansharpening': sepalPansharpening[i7]
            }
        elif layerType[i] == 'geoserver':
            i8 += 1
            overlay = {
                'geoserverUrl': geoserverUrl[i8],
                'geoserverLayers': geoserverLayers[i8],
                'geoserverService': geoserverService[i8],
                'geoserverVersion': geoserverVersion[i8],
                'geoserverFormat': geoserverFormat[i8]
            }
        elif layerType[i] == 'geea-gateway':
            i9 += 1
            overlay = {
                'geeaImageName': geeaImageName[i9],
                'geeaMin': geeaMin[i9],
                'geeaMax': geeaMax[i9],
                'geeaBands': geeaBands[i9],
                'geeaGamma': geeaGamma[i9],
                'geeaPalette': geeaPalette[i9]
            }
        if overlay:
            overlay['layerName'] = layerName[i]
            overlay['type'] = layerType[i]
            cleanOverlay = { k:v.strip() for k, v in overlay.iteritems() }
            overlays.append(cleanOverlay)
    return overlays

def getCodeListFromRequest(request):
    codeList = {
        'id': 'class',
        'name': 'class',
        'items': []
    }
    codeListCode = request.form.getlist('codeListCode[]')
    for i in range(0, len(codeListCode)):
        codeList['items'].append({
            'code': i+1,
            'label': codeListCode[i]
        })
    return codeList
