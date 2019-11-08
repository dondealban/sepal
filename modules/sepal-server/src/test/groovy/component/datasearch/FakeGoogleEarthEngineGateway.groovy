package component.datasearch

import org.openforis.sepal.component.datasearch.api.*
import org.openforis.sepal.user.User

class FakeGoogleEarthEngineGateway implements GoogleEarthEngineGateway {
    private final Map<Aoi, Collection<SceneArea>> sceneAreasByFusionTable = [:]


    Collection<SceneArea> findSceneAreasInAoi(String dataSet, Aoi aoi, User user) {
        return sceneAreasByFusionTable[aoi]
    }

    MapLayer preview(Map image, User user) {
        return null
    }

    List<SceneArea> areas(String fusionTable, String keyColumn, String keyValue, List<SceneArea> sceneAreas) {
        sceneAreasByFusionTable[new FusionTableShape(fusionTable, keyColumn, keyValue)] = sceneAreas
        return sceneAreas
    }
}
