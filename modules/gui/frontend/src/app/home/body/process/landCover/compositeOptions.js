import {Form, form} from 'widget/form/form'
import {Layout} from 'widget/layout'
import {Panel} from 'widget/panel/panel'
import {RecipeActions, RecipeState} from './landCoverRecipe'
import {compose} from 'compose'
import {initValues, withRecipePath} from 'app/home/body/process/recipe'
import {msg} from 'translate'
import PropTypes from 'prop-types'
import React from 'react'
import styles from './compositeOptions.module.css'

const fields = {
    cloudThreshold: new Form.Field(),
    corrections: new Form.Field(),
    mask: new Form.Field(),
}

class CompositeOptions extends React.Component {
    constructor(props) {
        super(props)
        const {recipeId} = props
        this.recipeActions = RecipeActions(recipeId)
    }

    render() {
        const {recipePath, form} = this.props
        return (
            <Form.Panel
                className={styles.panel}
                form={form}
                statePath={recipePath + '.ui'}
                onApply={values => this.recipeActions.setCompositeOptions({
                    values,
                    model: valuesToModel(values)
                }).dispatch()}>
                <Panel.Header
                    icon='cog'
                    title={msg('process.landCover.panel.compositeOptions.title')}/>
                <Panel.Content>
                    {this.renderContent()}
                </Panel.Content>
                <Form.PanelButtons/>
            </Form.Panel>
        )
    }

    renderContent() {
        const {inputs: {cloudThreshold, corrections, mask}} = this.props
        return (
            <Layout>
                <Form.Slider
                    label={msg('process.landCover.panel.compositeOptions.form.cloudThreshold.label')}
                    tooltip={msg('process.landCover.panel.compositeOptions.form.cloudThreshold.tooltip')}
                    tooltipPlacement='topLeft'
                    input={cloudThreshold}
                    minValue={0}
                    maxValue={100}
                    ticks={[0, 10, 25, 50, 75, 90, 100]}
                    snap
                    info={value => {
                        const type = value === 0 ? 'off' : value === 100 ? 'max' : 'value'
                        return msg(['process.landCover.panel.compositeOptions.form.cloudThreshold', type], {value})
                    }}/>
                <Form.Buttons
                    label={msg('process.landCover.panel.compositeOptions.form.corrections.label')}
                    input={corrections}
                    multiple={true}
                    options={[
                        //     {
                        //     value: 'SR',
                        //     label: msg('process.landCover.panel.compositeOptions.form.corrections.surfaceReflectance.label'),
                        //     tooltip: msg('process.landCover.panel.compositeOptions.form.corrections.surfaceReflectance.tooltip')
                        // },
                        {
                            value: 'BRDF',
                            label: msg('process.landCover.panel.compositeOptions.form.corrections.brdf.label'),
                            tooltip: msg('process.landCover.panel.compositeOptions.form.corrections.brdf.tooltip')
                        }, {
                            value: 'Terrain',
                            label: msg('process.landCover.panel.compositeOptions.form.corrections.terrain.label'),
                            tooltip: msg('process.landCover.panel.compositeOptions.form.corrections.terrain.tooltip')
                        }]}
                />
                <Form.Buttons
                    label={msg('process.landCover.panel.compositeOptions.form.mask.label')}
                    input={mask}
                    multiple={true}
                    options={[{
                        value: 'CLOUDS',
                        label: msg('process.landCover.panel.compositeOptions.form.mask.clouds.label'),
                        tooltip: msg('process.landCover.panel.compositeOptions.form.mask.clouds.tooltip')
                    }, {
                        value: 'HAZE',
                        label: msg('process.landCover.panel.compositeOptions.form.mask.haze.label'),
                        tooltip: msg('process.landCover.panel.compositeOptions.form.mask.haze.tooltip')
                    }, {
                        value: 'SHADOW',
                        label: msg('process.landCover.panel.compositeOptions.form.mask.shadow.label'),
                        tooltip: msg('process.landCover.panel.compositeOptions.form.mask.shadow.tooltip')
                    },
                        //     {
                        //     value: 'SNOW',
                        //     label: msg('process.landCover.panel.compositeOptions.form.mask.snow.label'),
                        //     tooltip: msg('process.landCover.panel.compositeOptions.form.mask.snow.tooltip')
                        // }
                    ]}
                />
            </Layout>
        )
    }
}

CompositeOptions.propTypes = {
    recipeId: PropTypes.string,
}

const valuesToModel = values => ({
    ...values
})

const modelToValues = (model = {}) => ({
    ...model
})

export default compose(
    CompositeOptions,
    form({fields}),
    initValues({
        getModel: props => RecipeState(props.recipeId)('model.compositeOptions'),
        getValues: props => RecipeState(props.recipeId)('ui.compositeOptions'),
        modelToValues,
        onInitialized: ({model, values, props}) =>
            RecipeActions(props.recipeId)
                .setCompositeOptions({values, model})
                .dispatch()
    }),
    withRecipePath()
)

// export default withRecipePath()(
//     initValues({
//         getModel: props => RecipeState(props.recipeId)('model.compositeOptions'),
//         getValues: props => RecipeState(props.recipeId)('ui.compositeOptions'),
//         modelToValues,
//         onInitialized: ({model, values, props}) =>
//             RecipeActions(props.recipeId)
//                 .setCompositeOptions({values, model})
//                 .dispatch()
//     })(
//         form({fields})(CompositeOptions)
//     )
// )
