import {RecipeState, getPrimitiveTypes} from './landCoverRecipe'
import {compose} from 'compose'
import {connect} from 'store'
import PropTypes from 'prop-types'
import React from 'react'
import styles from './legend.module.css'

const mapStateToProps = (state, ownProps) => {
    const recipeState = RecipeState(ownProps.recipeId)
    return {
        recipe: recipeState()
    }
}

class Legend extends React.Component {
    render() {
        const {recipe} = this.props
        return (
            <div className={styles.legend}>
                {getPrimitiveTypes(recipe).map(type => this.renderPrimitiveType(type))}
            </div>
        )
    }

    renderPrimitiveType(type) {
        return (
            <React.Fragment key={type.id}>
                <span className={styles.color} style={{backgroundColor: '#' + type.color}}/>
                <span className={styles.label}>{type.label}</span>
            </React.Fragment>
        )
    }
}

Legend.propTypes = {
    recipeId: PropTypes.string.isRequired
}

export default compose(
    Legend,
    connect(mapStateToProps)
)
