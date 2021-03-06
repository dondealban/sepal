import {Button} from 'widget/button'
import {ButtonGroup} from 'widget/buttonGroup'
import {Form, form} from 'widget/form/form'
import {Layout} from 'widget/layout'
import {compose} from 'compose'
import {msg} from 'translate'
import {requestPasswordReset$} from 'widget/user'
import Label from 'widget/label'
import Notifications from 'widget/notifications'
import PropTypes from 'prop-types'
import React from 'react'
import styles from './forgot-password.module.css'

const fields = {
    email: new Form.Field()
        .notBlank('landing.forgot-password.required')
        .email('landing.forgot-password.invalid')
}

export class ForgotPassword extends React.Component {
    cancel() {
        const {onCancel} = this.props
        onCancel()
    }

    requestPasswordReset(email) {
        this.props.stream('REQUEST_PASSWORD_RESET',
            requestPasswordReset$(email),
            () => {
                Notifications.success({message: msg('landing.forgot-password.success', {email})})
                this.cancel()
            }
        )
    }

    render() {
        const {form, inputs: {email}, action} = this.props
        return (
            <Form
                className={styles.form}
                onSubmit={() => this.requestPasswordReset(email.value)}>
                <div className={styles.inputs}>
                    <Layout spacing='loose'>
                        <div>
                            <Label msg={msg('landing.forgot-password.label')}/>
                            <div className={styles.instructions}>
                                {msg('landing.forgot-password.instructions')}
                            </div>
                        </div>
                        <Form.Input
                            input={email}
                            placeholder={msg('landing.forgot-password.placeholder')}
                            autoFocus
                            autoComplete='off'
                            tabIndex={1}
                            validate='onBlur'
                            errorMessage
                        />
                        <ButtonGroup layout='horizontal-nowrap-spaced'>
                            <Button
                                chromeless
                                look='transparent'
                                size='large'
                                shape='pill'
                                icon='undo'
                                label={msg('landing.forgot-password.cancel-link')}
                                tabIndex={3}
                                onMouseDown={e => e.preventDefault()}
                                onClick={() => this.cancel()}
                            />
                            <Button
                                type='submit'
                                look='apply'
                                size='x-large'
                                shape='pill'
                                icon={action('REQUEST_PASSWORD_RESET').dispatching ? 'spinner' : 'envelope'}
                                label={msg('landing.forgot-password.button')}
                                disabled={form.isInvalid() || action('REQUEST_PASSWORD_RESET').dispatching}
                                tabIndex={2}
                            />
                        </ButtonGroup>
                    </Layout>
                </div>
            </Form>
        )
    }
}

ForgotPassword.propTypes = {
    onCancel: PropTypes.func.isRequired,
    form: PropTypes.object,
    inputs: PropTypes.object
}

export default compose(
    ForgotPassword,
    form({fields})
)
