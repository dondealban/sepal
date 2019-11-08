package component.workersession

import org.openforis.sepal.command.ExecutionFailed

import static org.openforis.sepal.component.workersession.api.WorkerSession.State.ACTIVE
import static org.openforis.sepal.component.workersession.api.WorkerSession.State.CLOSED

class Heartbeat_Test extends AbstractWorkerSessionTest {
    def 'Given a timed out session, when sending a heartbeat, session is no longer timed out'() {
        def session = timedOutActiveSession()

        when:
        sendHeartbeat(session)

        then:
        closeTimedOutSessions()
        oneSessionIs ACTIVE
    }

    def 'Given a timed out session, when sending a heartbeat with different user, exception is thrown, and session is still timed out'() {
        def session = timedOutActiveSession()

        when:
        sendHeartbeat(session, [username: 'another-username'])

        then:
        thrown ExecutionFailed
        closeTimedOutSessions()
        oneSessionIs CLOSED
    }

    def 'Given a timed out session, when sending a heartbeat without username, session is no longer timed out'() {
        def session = timedOutActiveSession()

        when:
        sendHeartbeat(session, [username: null])

        then:
        closeTimedOutSessions()
        oneSessionIs ACTIVE
    }

    def 'Given a timed out pending session, when sending a heartbeat without username, session is still timed out'() {
        def session = timedOutPendingSession()

        when:
        sendHeartbeat(session, [username: null])

        then:
        closeTimedOutSessions()
        oneSessionIs CLOSED
    }
}
