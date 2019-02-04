import {Field, form} from 'widget/form'
import {Msg, msg} from 'translate'
import {PanelContent, PanelHeader} from 'widget/panel'
import {RecipeActions, RecipeState} from '../../mosaicRecipe'
import {arrayEquals} from 'collections'
import {imageSourceById, sources} from 'sources'
import {initValues, withRecipePath} from 'app/home/body/process/recipe'
import Buttons from 'widget/buttons'
import FormPanel, {FormPanelButtons} from 'widget/formPanel'
import Label from 'widget/label'
import PropTypes from 'prop-types'
import React from 'react'
import styles from './sources.module.css'
import updateSource from './updateSource'

const fields = {
    source: new Field()
        .notEmpty('process.mosaic.panel.sources.form.required'),
    dataSets: new Field()
        .notEmpty('process.mosaic.panel.sources.form.required')
}

class Sources extends React.Component {
    constructor(props) {
        super(props)
        const {recipeId} = props
        this.recipeActions = RecipeActions(recipeId)
        const {dateRange, isSourceInDateRange, isDataSetInDateRange} = RecipeState(recipeId)
        this.dateRange = dateRange
        this.isSourceInDateRange = isSourceInDateRange
        this.isDataSetInDateRange = isDataSetInDateRange
    }

    lookupDataSetNames(sourceValue) {
        return sourceValue ? imageSourceById[sourceValue].dataSets : null
    }

    sourceChanged(sourceValue) {
        const {inputs: {dataSets}} = this.props
        const dataSetNames = this.lookupDataSetNames(sourceValue)
        const dataSetsValue = dataSetNames.length === 1 ? [dataSetNames[0]] : null
        dataSets.set(dataSetsValue)
    }

    renderSources() {
        const {inputs: {source}} = this.props
        const options = sources.map(value =>
            ({
                value,
                label: msg(['process.mosaic.panel.sources.form.source.options', value]),
                neverSelected: !this.isSourceInDateRange(value)
            })
        )
        return (
            <div>
                <Label msg={msg('process.mosaic.panel.sources.form.source.label')}/>
                <Buttons
                    className={styles.sources}
                    input={source}
                    options={options}
                    onChange={sourceValue => this.sourceChanged(sourceValue)}/>
            </div>
        )
    }

    renderDataSets() {
        const {inputs: {source, dataSets}} = this.props
        if (!source.value)
            return
        const dataSetNames = this.lookupDataSetNames(source.value)
        const options = (dataSetNames || []).map(value =>
            ({
                value,
                label: msg(['process.mosaic.panel.sources.form.dataSets.options', value, 'label']),
                tooltip: msg(['process.mosaic.panel.sources.form.dataSets.options', value, 'tooltip']),
                disabled: !this.isDataSetInDateRange(value)
            })
        )
        const content = options.length > 1
            ? <Buttons className={styles.dataSets} input={dataSets} options={options} multiple/>
            : <div className={styles.oneDataSet}><Msg id='process.mosaic.panel.sources.form.dataSets.oneDataSet'/></div>
        return (
            <div>
                <Label msg={msg('process.mosaic.panel.sources.form.dataSets.label')}/>
                {content}
            </div>
        )
    }

    render() {
        const {recipePath, form} = this.props
        return (
            <FormPanel
                className={styles.panel}
                form={form}
                statePath={recipePath + '.ui'}
                onApply={values => this.recipeActions.setSources({
                    values,
                    model: valuesToModel(values)
                }).dispatch()}>
                <PanelHeader
                    icon='satellite-dish'
                    title={msg('process.mosaic.panel.sources.title')}/>

                <PanelContent>
                    <div>
                        {this.renderSources()}
                        {this.renderDataSets()}
                    </div>
                </PanelContent>

                <FormPanelButtons/>
            </FormPanel>
        )
    }

    componentDidUpdate() {
        const {inputs: {source, dataSets}} = this.props
        const [selectedSource, selectedDataSets] = updateSource(source.value, dataSets.value, ...this.dateRange())
        if (selectedSource !== source.value)
            source.set(selectedSource)

        if (!arrayEquals(selectedDataSets, dataSets.value))
            dataSets.set(selectedDataSets)
    }
}

Sources.propTypes = {
    recipeId: PropTypes.string
}

const valuesToModel = values => {
    return {[values.source]: values.dataSets ? [...values.dataSets] : null}
}

const modelToValues = model => {
    return {
        source: Object.keys(model)[0],
        dataSets: [...Object.values(model)[0]]
    }
}

export default withRecipePath()(
    initValues({
        getModel: props => RecipeState(props.recipeId)('model.sources'),
        getValues: props => RecipeState(props.recipeId)('ui.sources'),
        modelToValues,
        onInitialized: ({model, values, props}) =>
            RecipeActions(props.recipeId)
                .setSources({values, model})
                .dispatch()
    })(
        form({fields})(Sources)
    )
)
