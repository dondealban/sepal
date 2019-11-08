import {Toolbar} from 'widget/toolbar/toolbar'
import {compose} from 'compose'
import {msg} from 'translate'
import {withRecipe} from 'app/home/body/process/recipeContext'
import PropTypes from 'prop-types'
import React from 'react'
import styles from './initToolbar.module.css'

const recipeToProps = recipe => {
    const model = recipe.model
    return {
        initialized: model.aoi && model.period && model.typology
    }
}

class InitToolbar extends React.Component {
    render() {
        const {recipeContext: {statePath}} = this.props
        const uiStatePath = statePath + '.ui'

        return (
            <Toolbar
                statePath={uiStatePath}
                vertical
                placement='bottom-right'
                panel
                className={styles.bottom}>
                <Toolbar.ActivationButton
                    id='areaOfInterest'
                    label={msg('process.mosaic.panel.areaOfInterest.button')}
                    tooltip={msg('process.mosaic.panel.areaOfInterest.tooltip')}/>
                <Toolbar.ActivationButton
                    id='period'
                    label={msg('process.landCover.panel.period.button')}
                    tooltip={msg('process.landCover.panel.period.tooltip')}/>
                <Toolbar.ActivationButton
                    id='typology'
                    label={msg('process.landCover.panel.typology.button')}
                    tooltip={msg('process.landCover.panel.typology.tooltip')}/>
            </Toolbar>
        )
    }
}

InitToolbar.propTypes = {
    recipeId: PropTypes.string.isRequired
}

export default compose(
    InitToolbar,
    withRecipe(recipeToProps)
)
