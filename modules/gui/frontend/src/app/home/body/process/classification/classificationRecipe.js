import {msg} from 'translate'
import {recipeActionBuilder} from '../recipe'
import _ from 'lodash'
import api from 'api'

export const defaultModel = {
    auxiliaryImagery: []
}

export const RecipeActions = id => {
    const actionBuilder = recipeActionBuilder(id)

    const set = (name, prop, value, otherProps) =>
        actionBuilder(name, otherProps)
            .set(prop, value)
            .build()
    return {
        retrieve(retrieveOptions) {
            return actionBuilder('REQUEST_CLASSIFICATION_RETRIEVAL', {retrieveOptions})
                .setAll({
                    'ui.retrieveState': 'SUBMITTED',
                    'ui.retrieveOptions': retrieveOptions,
                })
                .sideEffect(recipe => submitRetrieveRecipeTask(recipe))
                .build()
        },
        setEETableColumns(columns) {
            return set('SET_EE_TABLE_COLUMNS', 'ui.eeTable.columns', columns, {columns})
        },
        hidePreview() {
            return set('HIDE_PREVIEW', 'ui.hidePreview', true)
        },
        showPreview() {
            return set('SHOW_PREVIEW', 'ui.hidePreview', false)
        },
        removeInputImage(imageToRemove) {
            actionBuilder('REMOVE_INPUT_IMAGE', {imageToRemove})
                .del(['model.inputImagery.images', {id: imageToRemove.id}])
                .del(['ui.inputImagery.images', {id: imageToRemove.id}])
                .dispatch()

        }
    }
}

const submitRetrieveRecipeTask = recipe => {
    const name = recipe.title || recipe.placeholder
    const scale = recipe.ui.retrieveOptions.scale
    const destination = recipe.ui.retrieveOptions.destination
    const taskTitle = msg(['process.classification.panel.retrieve.form.task', destination], {name})
    const bands = recipe.ui.retrieveOptions.bands
    const task = {
        'operation': `image.${destination === 'SEPAL' ? 'sepal_export' : 'asset_export'}`,
        'params':
            {
                title: taskTitle,
                description: name,
                image: {
                    recipe: _.omit(recipe, ['ui']), bands: {selection: bands},
                    scale
                }
            }
    }
    return api.tasks.submit$(task).subscribe()
}
