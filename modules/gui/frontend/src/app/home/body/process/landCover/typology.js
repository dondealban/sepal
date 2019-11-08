import {Form, form} from 'widget/form/form'
import {Panel} from 'widget/panel/panel'
import {RecipeActions, RecipeState} from './landCoverRecipe'
import {compose} from 'compose'
import {initValues, withRecipePath} from 'app/home/body/process/recipe'
import {msg} from 'translate'
import PropTypes from 'prop-types'
import React from 'react'
import styles from './typology.module.css'

const fields = {}

class Typology extends React.Component {
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
                onApply={values => this.recipeActions.setTypology({
                    values,
                    model: valuesToModel(values)
                }).dispatch()}>
                <Panel.Header
                    icon='cog'
                    title={msg('process.landCover.panel.typology.title')}/>

                <Panel.Content>
                    {this.renderContent()}
                </Panel.Content>

                <Form.PanelButtons/>
            </Form.Panel>
        )
    }

    renderContent() {
        return (
            <div className={styles.content}>
                Select (or create?) a typology somehow here.
            </div>
        )
    }
}

Typology.propTypes = {
    recipeId: PropTypes.string,
}

const valuesToModel = values => ({
    ...values
})

const modelToValues = (model = {}) => ({
    ...model
})

export default compose(
    Typology,
    form({fields}),
    initValues({
        getModel: props => RecipeState(props.recipeId)('model.typology'),
        getValues: props => RecipeState(props.recipeId)('ui.typology'),
        modelToValues,
        onInitialized: ({model, values, props}) =>
            RecipeActions(props.recipeId)
                .setTypology({values, model})
                .dispatch()
    }),
    withRecipePath()
)

// export default withRecipePath()(
//     initValues({
//         getModel: props => RecipeState(props.recipeId)('model.typology'),
//         getValues: props => RecipeState(props.recipeId)('ui.typology'),
//         modelToValues,
//         onInitialized: ({model, values, props}) =>
//             RecipeActions(props.recipeId)
//                 .setTypology({values, model})
//                 .dispatch()
//     })(
//         form({fields})(Typology)
//     )
// )
