package component.datasearch

import groovymvc.Controller
import org.openforis.sepal.component.datasearch.api.*
import org.openforis.sepal.component.datasearch.endpoint.DataSearchEndpoint
import org.openforis.sepal.component.datasearch.query.FindBestScenes
import org.openforis.sepal.component.datasearch.query.FindSceneAreasForAoi
import org.openforis.sepal.component.datasearch.query.FindScenesForSceneArea
import org.openforis.sepal.util.DateTime
import spock.lang.Ignore
import util.AbstractComponentEndpointTest

import static org.openforis.sepal.util.DateTime.parseDateString
import static org.openforis.sepal.util.DateTime.toDateTimeString

@Ignore
@SuppressWarnings("GroovyAssignabilityCheck")
class DataSearchEndpointTest extends AbstractComponentEndpointTest {
    def geeGateway = Mock GoogleEarthEngineGateway

    void registerEndpoint(Controller controller) {
        new DataSearchEndpoint(component, geeGateway, 'some-google-maps-api-key').registerWith(controller)
    }

    def 'POST /data/sceneareas/?countryIso= returns sceneareas'() {
        when:
        def response = post(path: 'data/sceneareas', query: [countryIso: 'aa'])
        assert response.status == 200

        then:
        1 * component.submit({ it.aoi.keyValue == 'aa' } as FindSceneAreasForAoi) >> [
            new SceneArea(
                id: 'scene area id',
                polygon: new Polygon([new LatLng(1d, 1d), new LatLng(2d, 2d), new LatLng(3d, 3d), new LatLng(1d, 1d)]))
        ]
        sameJson(response.data, [
            [
                sceneAreaId: 'scene area id',
                polygon: [[1d, 1d], [2d, 2d], [3d, 3d], [1d, 1d]]
            ]
        ])
        response.status == 200
    }

    def 'GET /data/sceneareas/{sceneAreaId} returns scenes'() {
        def query = [fromDate: '2016-01-01', toDate: '2016-02-01', targetDayOfYear: 365]
        def expectedSceneQuery = new SceneQuery(
            source: 'LANDSAT',
            sceneAreaId: 'someSceneAreaId',
            fromDate: parseDateString(query.fromDate),
            toDate: parseDateString(query.toDate),
            targetDayOfYear: query.targetDayOfYear,
        )
        def expectedScene = scene(expectedSceneQuery.fromDate)

        when:
        def response = get(path: 'data/sceneareas/someSceneAreaId', query: query)
        assert response.status == 200

        then:
        1 * component.submit({ it.sceneQuery == expectedSceneQuery } as FindScenesForSceneArea) >> [expectedScene]
        sameJson(response.data, [
            [
                sceneId: expectedScene.id,
                sensor: expectedScene.dataSet,
                browseUrl: expectedScene.browseUrl as String,
                acquisitionDate: DateTime.toDateString(expectedScene.acquisitionDate),
                cloudCover: expectedScene.cloudCover,
                sunAzimuth: expectedScene.sunAzimuth,
                sunElevation: expectedScene.sunElevation,
                daysFromTargetDay: 1
            ]
        ])
        response.status == 200
    }

    def 'GET /data/best-scenes returns scenes'() {
        def expectedQuery = new FindBestScenes(
            source: LANDSAT,
            sceneAreaIds: ['some-area', 'another-area'],
            dataSets: ['some-sensor', 'another-sensor'],
            fromDate: parseDateString('2015-01-01'),
            toDate: parseDateString('2016-01-01'),
            targetDayOfYear: 22,
            targetDayOfYearWeight: 0.12,
            cloudCoverTarget: 0.001
        )
        def expectedScene = scene(parseDateString('2015-01-01'))

        when:
        def response = post(path: 'data/best-scenes', query: [
            sceneAreaIds: 'some-area, another-area',
            dataSets: 'some-sensor, another-sensor',
            fromDate: toDateTimeString(expectedQuery.fromDate),
            toDate: toDateTimeString(expectedQuery.toDate),
            targetDayOfYear: expectedQuery.targetDayOfYear,
            targetDayOfYearWeight: expectedQuery.targetDayOfYearWeight,
            cloudCoverTarget: expectedQuery.cloudCoverTarget
        ])
        assert response.status == 200

        then:
        1 * component.submit(expectedQuery) >> [
            'some-area': [expectedScene]
        ]
        sameJson(response.data, [
            'some-area': [[
                              sceneId: expectedScene.id,
                              sensor: expectedScene.dataSet,
                              browseUrl: expectedScene.browseUrl as String,
                              acquisitionDate: DateTime.toDateString(expectedScene.acquisitionDate),
                              cloudCover: expectedScene.cloudCover,
                              sunAzimuth: expectedScene.sunAzimuth,
                              sunElevation: expectedScene.sunElevation,
                              daysFromTargetDay: 21
                          ]]
        ])
        response.status == 200
    }

    private SceneMetaData scene(Date acquisitionDate) {
        new SceneMetaData(
            id: 'scene id',
            source: 'LANDSAT',
            sceneAreaId: 'scene area id',
            dataSet: 'dataSet id',
            acquisitionDate: acquisitionDate,
            cloudCover: 1.2,
            sunAzimuth: 3.4,
            sunElevation: 5.6,
            browseUrl: URI.create('http://browse.url'),
            updateTime: new Date() - 12
        )
    }
}

