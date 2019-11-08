package component.user

import org.openforis.sepal.component.user.api.TokenStatus
import org.openforis.sepal.component.user.command.ValidateToken

import static java.util.concurrent.TimeUnit.DAYS

class ValidateTokenStatusTest extends AbstractUserTest {
    def 'Given a valid invitation token, when validating token, user is returned'() {
        def user = inviteUser()
        def token = mailServer.token

        when:
        def tokenStatus = validateToken(token)

        then:
        tokenStatus.user.id == user.id
        !tokenStatus.expired
    }

    def 'Given an invalid invitation token, when validating token, null is returned'() {
        inviteUser()

        when:
        def tokenStatus = validateToken('an-invalid-token')

        then:
        !tokenStatus
    }

    def 'Given an expired invitation token, when validating token, token status is expired'() {
        def user = inviteUser()
        def token = mailServer.token
        clock.forward(TokenStatus.MAX_AGE_DAYS + 1, DAYS)

        when:
        def tokenStatus = validateToken(token)

        then:
        tokenStatus.user.id == user.id
        tokenStatus.expired
    }

    TokenStatus validateToken(String token) {
        component.submit(
                new ValidateToken(token: token)
        )
    }
}

