import {Form, form} from 'widget/form/form'
import {Layout} from 'widget/layout'
import {Panel} from 'widget/panel/panel'
import {RecipeActions, RecipeState} from './landCoverRecipe'
import {Subject} from 'rxjs'
import {compose} from 'compose'
import {initValues, withRecipePath} from 'app/home/body/process/recipe'
import {loadFusionTableColumns$} from 'app/home/map/fusionTable'
import {map, takeUntil} from 'rxjs/operators'
import {msg} from 'translate'
import PropTypes from 'prop-types'
import React from 'react'
import styles from './trainingData.module.css'

const fields = {
    fusionTable: new Form.Field()
        .notBlank('process.landCover.panel.trainingData.form.fusionTable.required'),
    yearColumn: new Form.Field()
        .notBlank('process.landCover.panel.trainingData.form.yearColumn.required'),
    classColumn: new Form.Field()
        .notBlank('process.landCover.panel.trainingData.form.classColumn.required')
}

const constraints = {
    yearAndClassColumnsSame: new Form.Constraint(['yearColumn', 'classColumn'])
        .skip(({fusionTable}) => {
            return !fusionTable
        })
        .predicate(({yearColumn, classColumn}) => {
            return yearColumn !== classColumn
        }, 'process.landCover.panel.trainingData.form.yearAndClassColumnsSame')
}

class TrainingData extends React.Component {
    constructor(props) {
        super(props)
        this.fusionTableChanged$ = new Subject()
        this.recipeActions = RecipeActions(props.recipeId)
    }

    loadFusionTableColumns(fusionTableId) {
        this.props.asyncActionBuilder('LOAD_FUSION_TABLE_COLUMNS',
            loadFusionTableColumns$(fusionTableId, {includedTypes: ['NUMBER']}).pipe(
                map(response => {
                    if (response.error)
                        this.props.inputs.fusionTable.setInvalid(
                            msg(response.error.key)
                        )
                    return (response.columns || [])
                        .filter(column => column.type !== 'LOCATION')
                }),
                map(columns => this.recipeActions.setFusionTableColumns(columns)),
                takeUntil(this.fusionTableChanged$))
        )
            .dispatch()
    }

    render() {
        const {recipePath, primitiveTypes, form} = this.props
        return (
            <Form.Panel
                className={styles.panel}
                form={form}
                statePath={recipePath + '.ui'}
                onApply={values => this.recipeActions.setTrainingData({
                    values,
                    model: valuesToModel(values, primitiveTypes)
                }).dispatch()}>
                <Panel.Header
                    icon='cog'
                    title={msg('process.landCover.panel.trainingData.title')}/>
                <Panel.Content>
                    {this.renderContent()}
                </Panel.Content>
                <Form.PanelButtons/>
            </Form.Panel>
        )
    }

    renderContent() {
        const {action, columns, inputs: {fusionTable, yearColumn, classColumn}} = this.props
        const columnState = action('LOAD_FUSION_TABLE_COLUMNS').dispatching
            ? 'loading'
            : columns && columns.length > 0
                ? 'loaded'
                : 'noFusionTable'

        const yearPlaceholder = msg(`process.landCover.panel.trainingData.form.yearColumn.placeholder.${columnState}`)
        const classPlaceholder = msg(`process.landCover.panel.trainingData.form.classColumn.placeholder.${columnState}`)
        return (
            <Layout>
                <Form.Input
                    label={msg('process.landCover.panel.trainingData.form.fusionTable.label')}
                    autoFocus
                    input={fusionTable}
                    placeholder={msg('process.landCover.panel.trainingData.form.fusionTable.placeholder')}
                    spellCheck={false}
                    onChange={e => {
                        yearColumn.set('')
                        classColumn.set('')
                        this.recipeActions.setFusionTableColumns(null).dispatch()
                        this.fusionTableChanged$.next()
                        const fusionTableMinLength = 30
                        if (e && e.target.value.length > fusionTableMinLength)
                            this.loadFusionTableColumns(e.target.value)
                    }}
                    errorMessage
                />
                <Form.Combo
                    label={msg('process.landCover.panel.trainingData.form.yearColumn.label')}
                    input={yearColumn}
                    busy={action('LOAD_FUSION_TABLE_COLUMNS').dispatching}
                    disabled={!columns || columns.length === 0}
                    placeholder={yearPlaceholder}
                    options={(columns || []).map(({name}) => ({value: name, label: name}))}
                />
                <Form.Combo
                    label={msg('process.landCover.panel.trainingData.form.classColumn.label')}
                    input={classColumn}
                    busy={action('LOAD_FUSION_TABLE_COLUMNS').dispatching}
                    disabled={!columns || columns.length === 0}
                    placeholder={classPlaceholder}
                    options={(columns || []).map(({name}) => ({value: name, label: name}))}
                    errorMessage={[classColumn, 'yearAndClassColumnsSame']}
                />
            </Layout>
        )
    }
}

TrainingData.propTypes = {
    recipeId: PropTypes.string,
}

const valuesToModel = (values, primitiveTypes) => {
    const classByPrimitive = {}
    primitiveTypes && primitiveTypes.forEach(primitiveType => {
        return classByPrimitive[primitiveType.id] = primitiveType.value
    }
    )
    return {
        type: 'fusionTable',
        tableId: values.fusionTable,
        yearColumn: values.yearColumn,
        classColumn: values.classColumn,
        classByPrimitive
    }
}

const modelToValues = (model = {}) => ({
    fusionTable: model.tableId,
    yearColumn: model.yearColumn,
    classColumn: model.classColumn
})

export default compose(
    TrainingData,
    form({fields, constraints}),
    initValues({
        getModel: props => RecipeState(props.recipeId)('model.trainingData'),
        getValues: props => RecipeState(props.recipeId)('ui.trainingData'),
        modelToValues,
        onInitialized: ({model, values, props}) =>
            RecipeActions(props.recipeId)
                .setTrainingData({values, model})
                .dispatch()
    }),
    withRecipePath()
)

// export default withRecipePath()(
//     initValues({
//         getModel: props => RecipeState(props.recipeId)('model.trainingData'),
//         getValues: props => RecipeState(props.recipeId)('ui.trainingData'),
//         modelToValues,
//         onInitialized: ({model, values, props}) =>
//             RecipeActions(props.recipeId)
//                 .setTrainingData({values, model})
//                 .dispatch()
//     })(
//         form({fields, constraints})(TrainingData)
//     )
// )
