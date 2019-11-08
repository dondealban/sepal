import React from 'react'

const withContext = (Context, prop, required = false) =>
    () => // wrapped with apparently useless function for consistency with other "with*" wrappers
        WrappedComponent =>
            class HigherOrderComponent extends React.Component {
                wrap(context) {
                    if (required && !context) {
                        throw Error(`Component has no ${prop}: ${WrappedComponent}`)
                    }
                    return React.createElement(WrappedComponent, {
                        ...this.props,
                        [prop]: context
                    })
                }
                render() {
                    return (
                        <Context.Consumer>
                            {context => this.wrap(context)}
                        </Context.Consumer>
                    )
                }
            }

export default withContext
