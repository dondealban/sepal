import {Activator} from 'widget/activation/activator'
import {Button} from 'widget/button'
import {ButtonGroup} from 'widget/buttonGroup'
import {CenteredProgress} from 'widget/progress'
import {Form, form} from 'widget/form/form'
import {Layout} from 'widget/layout'
import {Panel} from 'widget/panel/panel'
import {activatable} from 'widget/activation/activatable'
import {compose} from 'compose'
import {connect} from 'store'
import {currentUser} from 'widget/user'
import {msg} from 'translate'
import {revokeGoogleAccess$, updateCurrentUserDetails$} from 'widget/user'
import ChangePassword from './changePassword'
import Notifications from 'widget/notifications'
import React from 'react'
import api from 'api'
import styles from './userDetails.module.css'

const fields = {
    name: new Form.Field()
        .notBlank('user.userDetails.form.name.required'),
    email: new Form.Field()
        .notBlank('user.userDetails.form.email.required'),
    organization: new Form.Field()
}
const mapStateToProps = () => {
    const user = currentUser()
    return {
        user,
        values: {
            name: user.name,
            email: user.email,
            organization: user.organization
        }
    }
}

class _UserDetails extends React.Component {
    useUserGoogleAccount(e) {
        e.preventDefault()
        api.user.getGoogleAccessRequestUrl$(window.location.hostname)
            .subscribe(({url}) => window.location = url)
    }

    useSepalGoogleAccount(e) {
        e.preventDefault()
        this.props.stream('USE_SEPAL_GOOGLE_ACCOUNT', revokeGoogleAccess$())
    }

    updateUserDetails(userDetails) {
        updateCurrentUserDetails$(userDetails).subscribe(
            () => Notifications.success({message: msg('user.userDetails.update.success')}),
            error => Notifications.error({message: msg('user.userDetails.update.error'), error})
        )
    }

    renderGoogleAccountButton() {
        const {user, form} = this.props
        return user.googleTokens
            ? (
                <Button
                    label={msg('user.userDetails.useSepalGoogleAccount.label')}
                    icon='google'
                    iconType='brands'
                    tooltip={msg('user.userDetails.useSepalGoogleAccount.tooltip')}
                    disabled={form.isDirty()}
                    onClick={e => this.useSepalGoogleAccount(e)}
                />
            ) : (
                <Button
                    label={msg('user.userDetails.useUserGoogleAccount.label')}
                    icon='google'
                    iconType='brands'
                    tooltip={msg('user.userDetails.useUserGoogleAccount.tooltip')}
                    disabled={form.isDirty()}
                    onClick={e => this.useUserGoogleAccount(e)}
                />
            )
    }

    renderPanel() {
        const {form, inputs: {name, email, organization}} = this.props
        return this.props.stream('USE_SEPAL_GOOGLE_ACCOUNT').active
            ? <CenteredProgress title={msg('user.userDetails.switchingToSepalGoogleAccount')}/>
            : <React.Fragment>
                <Panel.Content>
                    <Layout>
                        <Form.Input
                            label={msg('user.userDetails.form.name.label')}
                            autoFocus
                            input={name}
                            spellCheck={false}
                            errorMessage
                        />
                        <Form.Input
                            label={msg('user.userDetails.form.email.label')}
                            input={email}
                            spellCheck={false}
                            errorMessage
                        />
                        <Form.Input
                            label={msg('user.userDetails.form.organization.label')}
                            input={organization}
                            spellCheck={false}
                        />
                        <div className={styles.googleAccount}>
                            <ButtonGroup>
                                {this.renderGoogleAccountButton()}
                            </ButtonGroup>
                        </div>
                    </Layout>
                </Panel.Content>
                <Form.PanelButtons>
                    <Activator id='changePassword'>
                        {({canActivate, activate}) =>
                            <Button
                                icon={'key'}
                                label={msg('user.changePassword.title')}
                                disabled={!canActivate || form.isDirty()}
                                onClick={() => activate()}/>
                        }
                    </Activator>
                </Form.PanelButtons>
            </React.Fragment>
    }

    render() {
        const {form, activatable: {deactivate}} = this.props
        return (
            <Form.Panel
                className={styles.panel}
                form={form}
                statePath='userDetails'
                modal
                onApply={userDetails => this.updateUserDetails(userDetails)}
                close={() => deactivate()}>
                <Panel.Header
                    icon='user'
                    title={msg('user.userDetails.title')}/>
                {this.renderPanel()}
            </Form.Panel>
        )
    }
}

const policy = () => ({
    _: 'disallow',
    changePassword: 'allow-then-deactivate'
})

const UserDetails = compose(
    _UserDetails,
    form({fields, mapStateToProps}),
    activatable({id: 'userDetails', policy, alwaysAllow: true})
)

UserDetails.propTypes = {}

const _UserDetailsButton = ({className, username}) =>
    <React.Fragment>
        <Activator id='userDetails'>
            {({active, activate}) =>
                <Button
                    chromeless
                    look='transparent'
                    size='large'
                    air='less'
                    additionalClassName={className}
                    label={username}
                    disabled={active}
                    onClick={() => activate()}
                    tooltip={msg('home.sections.user.profile')}
                    tooltipPlacement='top'
                    tooltipDisabled={active}/>
            }
        </Activator>
        <UserDetails/>
        <ChangePassword/>
    </React.Fragment>

export const UserDetailsButton = compose(
    _UserDetailsButton,
    connect(state => ({
        username: state.user.currentUser.username
    }))
)

UserDetailsButton.propTypes = {}
