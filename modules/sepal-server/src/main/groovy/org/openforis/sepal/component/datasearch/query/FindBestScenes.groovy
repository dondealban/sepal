package org.openforis.sepal.component.datasearch.query

import groovy.transform.Canonical
import org.openforis.sepal.component.datasearch.api.SceneMetaData
import org.openforis.sepal.component.datasearch.api.SceneMetaDataProvider
import org.openforis.sepal.component.datasearch.api.SceneQuery
import org.openforis.sepal.query.Query
import org.openforis.sepal.query.QueryHandler

@Canonical
class FindBestScenes implements Query<Map<String, List<SceneMetaData>>> {
    String source
    Collection<String> sceneAreaIds
    Collection<String> dataSets
    Date fromDate
    Date toDate
    int targetDayOfYear
    double targetDayOfYearWeight
    double cloudCoverTarget
    int minScenes = 1
    int maxScenes = Integer.MAX_VALUE
}

class FindBestScenesHandler implements QueryHandler<Map<String, List<SceneMetaData>>, FindBestScenes> {
    private final SceneMetaDataProvider sceneMetaDataProvider

    FindBestScenesHandler(SceneMetaDataProvider sceneMetaDataProvider) {
        this.sceneMetaDataProvider = sceneMetaDataProvider
    }

    Map<String, List<SceneMetaData>> execute(FindBestScenes query) {
        if (query.source == 'LANDSAT')
            landsat(query)
        else
            sentinel2(query)
    }

    private Map<String, List<SceneMetaData>> sentinel2(FindBestScenes query) {
        query.sceneAreaIds.collectEntries { sceneAreaId ->
            def scenes = []
            def cloudCover = 1
            sceneMetaDataProvider.eachScene(
                new SceneQuery(
                    source: query.source,
                    sceneAreaId: sceneAreaId,
                    dataSets: query.dataSets,
                    fromDate: query.fromDate,
                    toDate: query.toDate,
                    targetDayOfYear: query.targetDayOfYear),
                query.targetDayOfYearWeight) { SceneMetaData scene ->
                scenes << scene
                cloudCover *= scene.cloudCover / 100
                if (query.maxScenes <= scenes.size())
                    return false
                return (cloudCover > query.cloudCoverTarget || scenes.size() < query.minScenes)
            }
            return [(sceneAreaId): scenes]
        }
    }

    private Map<String, List<SceneMetaData>> landsat(FindBestScenes query) {
        query.sceneAreaIds.collectEntries { sceneAreaId ->
            def scenes = []
            def cloudCover = 1
            sceneMetaDataProvider.eachScene(
                new SceneQuery(
                    source: query.source,
                    sceneAreaId: sceneAreaId,
                    dataSets: query.dataSets,
                    fromDate: query.fromDate,
                    toDate: query.toDate,
                    targetDayOfYear: query.targetDayOfYear),
                query.targetDayOfYearWeight) { SceneMetaData scene ->
                scenes << scene
                cloudCover *= scene.cloudCover / 100
                if (query.maxScenes <= scenes.size())
                    return false
                return (cloudCover > query.cloudCoverTarget || scenes.size() < query.minScenes)
            }
            return [(sceneAreaId): scenes]
        }
    }
}
