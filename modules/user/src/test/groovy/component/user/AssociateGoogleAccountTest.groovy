package component.user


import org.openforis.sepal.component.user.command.AssociateGoogleAccount

class AssociateGoogleAccountTest extends AbstractUserTest {
    def 'Given an active user, when associatingaccount, tokens become accessible on the user and is stored in user home dir'() {
        def user = activeUser()

        when:
        component.submit(new AssociateGoogleAccount(username: user.username))

        then:
        def userTokens = loadUser(testUsername).googleTokens
        userTokens == googleOAuthClient.tokens
        earthEngineCredentialsFile(user.username).exists()
        googleTokensFromFile(user.username) == [
            access_token: userTokens.accessToken,
            access_token_expiry_date: userTokens.accessTokenExpiryDate
        ]
    }

    def 'Given non-whitelisted google account, when associating, tokens are not associated'() {
        def user = activeUser()
        googleEarthEngineWhitelistChecker.notWhiteListed()

        when:
        component.submit(new AssociateGoogleAccount(username: user.username))

        then:
        !loadUser(testUsername).googleTokens
    }
}
