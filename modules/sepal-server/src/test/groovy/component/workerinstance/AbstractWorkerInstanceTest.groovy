package component.workerinstance

import fake.Database
import fake.FakeClock
import org.openforis.sepal.component.workerinstance.WorkerInstanceComponent
import org.openforis.sepal.component.workerinstance.api.WorkerInstance
import org.openforis.sepal.component.workerinstance.command.*
import org.openforis.sepal.component.workerinstance.query.FindMissingInstances
import org.openforis.sepal.event.Event
import org.openforis.sepal.event.SynchronousEventDispatcher
import org.openforis.sepal.sql.SqlConnectionManager
import spock.lang.Specification

import java.util.concurrent.TimeUnit

import static java.util.concurrent.TimeUnit.MINUTES

abstract class AbstractWorkerInstanceTest extends Specification {
    final database = new Database(WorkerInstanceComponent.SCHEMA)
    final connectionManager = new SqlConnectionManager(database.dataSource)
    final eventDispatcher = new SynchronousEventDispatcher()
    final clock = new FakeClock()
    final instanceProvider = new FakeInstanceProvider(clock)
    final instanceProvisioner = new FakeInstanceProvisioner()
    final component = new WorkerInstanceComponent(
            connectionManager,
            eventDispatcher,
            instanceProvider,
            [],
            instanceProvisioner,
            clock)

    final events = [] as List<Event>

    final testWorkerType = 'test-worker-type'
    final testInstanceType = 'test-instance-type'
    final testUsername = 'test-username'

    def setup() {
        component.on(Event) { events << it }
    }

    final WorkerInstance requestInstance(Map args = [:]) {
        component.submit(new RequestInstance(
                username: username(args),
                workerType: args.workerType ?: testWorkerType,
                instanceType: args.instanceType ?: testInstanceType
        ))
    }

    final WorkerInstance provisionedInstance(Map args = [:]) {
        def instance = requestInstance(args)
        provisionInstance(instance)
        return instance
    }

    final WorkerInstance releaseInstance(WorkerInstance instance) {
        component.submit(new ReleaseInstance(instanceId: instance.id))
        return instance.release()
    }

    final void provisionInstance(WorkerInstance instance) {
        component.submit(new ProvisionInstance(username: instance.reservation.username, instance: instance))
    }

    final void releaseUnusedInstances(List<String> usedInstanceIds, int minAge = 1, TimeUnit timeUnit = MINUTES) {
        component.submit(new ReleaseUnusedInstances(
                usedInstanceIds: usedInstanceIds,
                minAge: minAge,
                timeUnit: timeUnit
        ))
    }

    final List<WorkerInstance> findMissingInstances(List<WorkerInstance> instances) {
        return component.submit(new FindMissingInstances(instances))
    }

    final WorkerInstance idleInstance(Map args = [:]) {
        def instance = requestInstance(args)
        releaseInstance(instance)
    }

    final void sizeIdlePool(
            Map<String, Integer> targetIdleCountByInstanceType,
            int timeBeforeChargeToTerminate = 5,
            TimeUnit timeUnit = MINUTES) {
        component.submit(new SizeIdlePool(
                targetIdleCountByInstanceType: targetIdleCountByInstanceType,
                timeBeforeChargeToTerminate: timeBeforeChargeToTerminate,
                timeUnit: timeUnit
        ))
    }

    final <E extends Event> E published(Class<E> eventType) {
        def recievedEvent = events.find { it.class.isAssignableFrom(eventType) }
        assert recievedEvent, "Expected to event of type $eventType.simpleName to have been published. Actually published $events"
        recievedEvent as E
    }

    final String username(Map args) {
        args.username ?: testUsername
    }

    final <T> T ago(int time, TimeUnit timeUnit, Closure<T> callback) {
        def result = callback.call()
        clock.forward(time, timeUnit)
        return result
    }
}
