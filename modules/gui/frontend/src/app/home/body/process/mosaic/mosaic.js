import {Content, SectionLayout} from 'widget/sectionLayout'
import {RecipeActions, defaultModel} from 'app/home/body/process/mosaic/mosaicRecipe'
import {compose} from 'compose'
import {msg} from 'translate'
import {recipe} from 'app/home/body/process/recipeContext'
import {selectFrom} from 'stateUtils'
import AoiLayer from './aoiLayer'
import AutoSelectScenes from './autoSelectScenes'
import BandSelection from './bandSelection'
import MapToolbar from 'app/home/map/mapToolbar'
import MosaicPreview from './mosaicPreview'
import MosaicToolbar from './panels/mosaicToolbar'
import React from 'react'
import SceneAreas from './sceneAreas'
import SceneDeselection from './sceneDeselection'
import SceneSelection from './sceneSelection'
import ShowSceneAreaToggle from 'app/home/body/process/mosaic/showSceneAreaToggle'
import styles from './mosaic.module.css'

const mapRecipeToProps = recipe => ({
    recipeId: selectFrom(recipe, 'id'),
    initialized: selectFrom(recipe, 'ui.initialized'),
})

class _Mosaic extends React.Component {
    constructor(props) {
        super(props)
        const {recipeId} = props
        const actions = RecipeActions(recipeId)
        actions.setSceneAreasShown(true).dispatch()
        actions.setBands('red, green, blue').dispatch()
        actions.setAutoSelectSceneCount({min: 1, max: 99}).dispatch()
    }

    render() {
        const {recipeId, recipeContext: {statePath}, initialized} = this.props
        return (
            <SectionLayout>
                <Content>
                    <div className={styles.mosaic}>
                        <MapToolbar statePath={statePath + '.ui'} mapContext={recipeId} labelLayerIndex={2}>
                            <ShowSceneAreaToggle/>
                        </MapToolbar>
                        <MosaicToolbar/>
                        <AoiLayer/>
                        {initialized
                            ? <React.Fragment>
                                <MosaicPreview/>
                                <SceneAreas/>
                                <AutoSelectScenes/>
                                <SceneSelection/>
                                <SceneDeselection/>
                                <BandSelection/>
                            </React.Fragment>
                            : null}
                    </div>
                </Content>
            </SectionLayout>
        )
    }
}

const Mosaic = compose(
    _Mosaic,
    recipe({defaultModel, mapRecipeToProps})
)

export default () => ({
    id: 'MOSAIC',
    labels: {
        name: msg('process.mosaic.create'),
        creationDescription: msg('process.mosaic.description'),
        tabPlaceholder: msg('process.mosaic.tabPlaceholder'),
    },
    components: {
        recipe: Mosaic
    }
})
