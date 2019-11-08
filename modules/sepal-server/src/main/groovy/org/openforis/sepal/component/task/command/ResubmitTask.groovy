package org.openforis.sepal.component.task.command

import groovy.transform.Canonical
import groovy.transform.EqualsAndHashCode
import org.openforis.sepal.command.AbstractCommand
import org.openforis.sepal.command.CommandHandler
import org.openforis.sepal.command.InvalidCommand
import org.openforis.sepal.command.Unauthorized
import org.openforis.sepal.component.task.api.Task
import org.openforis.sepal.component.task.api.TaskRepository
import org.openforis.sepal.component.task.api.WorkerGateway
import org.openforis.sepal.component.task.api.WorkerSessionManager
import org.openforis.sepal.util.Clock

import static org.openforis.sepal.component.task.api.Task.State.*

@EqualsAndHashCode(callSuper = true)
@Canonical
class ResubmitTask extends AbstractCommand<Task> {
    String instanceType
    String taskId
}

class ResubmitTaskHandler implements CommandHandler<Task, ResubmitTask> {
    private final TaskRepository taskRepository
    private final WorkerSessionManager sessionManager
    private final SubmitTaskHandler submitTaskHandler

    ResubmitTaskHandler(
        TaskRepository taskRepository,
        WorkerSessionManager sessionManager,
        WorkerGateway workerGateway,
        Clock clock) {
        this.taskRepository = taskRepository
        this.sessionManager = sessionManager
        submitTaskHandler = new SubmitTaskHandler(taskRepository, sessionManager, workerGateway, clock)
    }

    Task execute(ResubmitTask command) {
        def task = taskRepository.getTask(command.taskId)
        if (task.username != command.username)
            throw new Unauthorized("Task not owned by user: $task", command)
        if (![CANCELED, FAILED, COMPLETED].contains(task.state))
            throw new InvalidCommand("Only canceled, failed, and completed tasks can be resubmitted", command)
        taskRepository.remove(task)
        def instanceType = command.instanceType ?: sessionManager.defaultInstanceType
        def resubmittedTask = submitTaskHandler.execute(new SubmitTask(
            username: command.username,
            instanceType: instanceType,
            operation: task.operation,
            params: task.params
        ))
        return resubmittedTask
    }
}
