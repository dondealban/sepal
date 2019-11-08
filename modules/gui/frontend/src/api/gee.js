import {get$, postForm$, postJson$} from 'http-client'
import {map} from 'rxjs/operators'

export default {
    preview$: ({recipe, ...params}) =>
        postJson$('/api/gee/preview', {body: {recipe, ...params}, retries: 0}),
    bands$: ({recipe, ...params}) =>
        postJson$('/api/gee/bands', {body: {recipe, ...params}, retries: 0})
            .pipe(toResponse),
    sceneAreas$: ({aoi, source}) =>
        get$('/api/gee/sceneareas', {query: {
            aoi: JSON.stringify(aoi),
            source: source
        }}).pipe(toResponse),
    scenesInSceneArea$: ({sceneAreaId, dates, sources, sceneSelectionOptions}) =>
        get$(`/api/data/sceneareas/${sceneAreaId}`, {
            query: {
                query: JSON.stringify({dates, sources, sceneSelectionOptions})}
        }).pipe(toResponse),
    autoSelectScenes$: ({sceneAreaIds, sources, dates, sceneSelectionOptions, sceneCount, cloudCoverTarget}) =>
        postForm$('/api/data/best-scenes', {
            body: {
                query: JSON.stringify({
                    sceneAreaIds, sources, dates, sceneSelectionOptions, sceneCount, cloudCoverTarget
                })
            }
        }).pipe(toResponse),
    recipeGeometry$: recipe =>
        postJson$('/api/gee/recipe/geometry', {body: {recipe}})
            .pipe(toResponse),
    loadEETableColumns$: tableId =>
        get$(`/api/gee/table/columns`,
            {query: {tableId}}
    ).pipe(toResponse),
    loadEETableColumnValues$: (tableId, columnName) =>
        get$(`/api/gee/table/columnValues`,
            {query: {tableId, columnName}}
    ).pipe(toResponse),
    eeTableMap$: ({tableId, columnName, columnValue, color}) =>
        get$(`/api/gee/table/map`,
            {query: {tableId, columnName, columnValue, color}}
    ).pipe(toResponse),
    queryEETable$: ({select, from, where, orderBy}) =>
        postJson$(`/api/gee/table/query`,
            {body: {select, from, where, orderBy}}
        ).pipe(toResponse),
}

const toResponse = map(e => e.response)
