import {RecipeActions} from 'app/home/body/process/mosaic/mosaicRecipe'
import {compose} from 'compose'
import {isRecipeOpen} from 'app/home/body/process/recipe'
import {msg} from 'translate'
import {selectFrom} from 'stateUtils'
import {sepalMap} from '../../../../../map/map'
import {setAoiLayer} from 'app/home/map/aoiLayer'
import {withRecipe} from 'app/home/body/process/recipeContext'
import PropTypes from 'prop-types'
import React from 'react'
import styles from './polygonSection.module.css'

const mapRecipeToProps = recipe => {
    return {
        recipeId: recipe.id,
        labelsShown: selectFrom(recipe, 'ui.labelsShown')
    }
}

class PolygonSection extends React.Component {
    constructor(props) {
        super(props)
        this.wereLabelsShown = props.labelsShown
        this.recipeActions = RecipeActions(props.recipeId)
    }

    componentDidMount() {
        const {recipeId, inputs: {polygon}} = this.props

        this.recipeActions.setLabelsShown(true).dispatch()
        sepalMap.getContext(recipeId).drawPolygon('aoi', drawnPolygon => {
            polygon.set(drawnPolygon)
        })
    }

    componentWillUnmount() {
        this.disableDrawingMode()
        if (isRecipeOpen(this.props.recipeId))
            this.recipeActions.setLabelsShown(this.wereLabelsShown).dispatch()
    }

    disableDrawingMode() {
        const {recipeId} = this.props
        sepalMap.getContext(recipeId).disableDrawingMode()
    }

    render() {
        return (
            <div className={styles.polygon}>
                {msg('process.mosaic.panel.areaOfInterest.form.polygon.description')}
            </div>
        )
    }

    componentDidUpdate(prevProps) {
        if (prevProps.inputs === this.props.inputs)
            return

        const {recipeId, inputs: {polygon}, componentWillUnmount$} = this.props
        setAoiLayer({
            contextId: recipeId,
            aoi: {
                type: 'POLYGON',
                path: polygon.value
            },
            fill: true,
            destroy$: componentWillUnmount$,
            onInitialized: () => sepalMap.getContext(recipeId).fitLayer('aoi')
        })
    }

}

PolygonSection.propTypes = {
    inputs: PropTypes.object.isRequired,
    recipeId: PropTypes.string.isRequired,
    labelsShown: PropTypes.any
}

export default compose(
    PolygonSection,
    withRecipe(mapRecipeToProps)
)
