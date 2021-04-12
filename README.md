# Open source scheduler and orchestrator for Lambda functions

# AWS-T1
Team ID: AWS-T1 | Team Members: Pushpendra kumar, Shantanu Sharma

# Tech Stack
1.  Backend  : Express, MongoDB
2.  Frontend : Bootstrap, Javascript, HTML, CSS

# Task Scheduler
Task scheduler library, which exposes REST APIs that can be accessed to schedule, modify, retrieve and delete tasks which are **Lambda functions** (a serverless service by AWS which allows you to run snippets of code without needing server deployment.). Tasks here are the api endpoint url of the AWS lambda. Example API Endpoint URL - https://a6ilch6fb5.execute-api.ap-south-1.amazonaws.com/default/trial

## Task Scheduler api endpoints
Users can use these endpoints to schedule/retrieve/modify and cancel tasks(lambda functions).

## /scheduler/schedule
1. Accepts endpoint URL for Lambda Task, Date and time at which the task is to be scheduled
2. Accepts the number of retries and the duration between retries for a Task. If the    task fails, the task is re-triggered based on the details passed by the user till it succeeds or retries expires.
3. schedules the task returns the created Task Id

## /scheduler/retrieve-tasks
1.  Accepts taskState(scheduled,running,completed,cancelled,All)
2.  Retrieves a list of tasks based on current status of the task.
3.  taskState
    1.  All        : retrieves all tasks created by **any** user irrespective of task-state
    2.  scheduled  : retrieves all tasks created by logged in user in scheduled state
    3.  running    : retrieves all tasks created by logged in user in running state
    4.  completed  : retrieves all tasks created by logged in user in completed state
    5.  cancelled  : retrieves all tasks created by logged in user in cancelled state
    6.  failed     : retrieves all tasks created by logged in user in failed state

## /scheduler/modify
1.  Accepts Task Id, modified date and time 
2.  Only the tasks in scheduled state can be modified 
2.  It re-schedules the task at the (modified date and time) else returns that task cannot be modified.

## /scheduler/cancel
1.  Accepts taskId of the task to be cancelled
2.  Only the tasks in scheduled state can be cancelled
2.  It cancels task and Returns a boolean value to confirm the task has been cancelled, else returns that task cannot be cancelled.

# Task Orchestrator
1.  User provides sequence of tasks and an additional condition check task as input to the Orchestrator library. These need to be scheduled in sequence. All the tasks and the condition check task will be in the form of lambda functions. User will also provide initial delay for the first Task.
2.  The Orchestrator library will schedule these tasks (and the condition check task) as a Task Set and return the Task Set Id to the user.
3.  Workflow:
    The Orchestrator library will execute the first task from the sequence of tasks after the initial delay expires. It will then execute the condition check task after an delay of conditionCheckTaskDelay and check its status. If success, it will execute the second task in the sequence else it will re-trigger condition check url till it succeeds or conditionCheckRetries expires. If retries expires, fallback task gets executed else orchestrator moves to the next task in sequence.
4.  Explanation taskStates orchestration
    1. scheduled: First task is yet to be executed i.e initial delay has not expired
    2. running: Executing a task from the sequence of orchestration tasks or executing the condition check task 
    3. success: successfully executed all the tasks in the orchestration sequence
    4. cancelled: User cancelled the task before the first task in sequence got triggered.  
    5. failed: If any one of task in orchestration sequence failed or condition check failed(even after all retries expired)

## Task Orchestrator api endpoints
Users can use these endpoints to schedule/retrieve/ and cancel orchestrations(lambda functions).

## /orchestrator/orchestrate
1. Accepts sequence of lambda Tasks to orchestrate, condition check lambda url, initial delay(time delay after which first task in sequence gets triggered), timeDelayForConditionCheck(conditionCheckTask will be scheduled to be executed after timeDelayForConditionCheck)
2. Accepts the number of conditionCheckRetries and the duration between retries. If the  condition check task fails, the condition check task is re-triggered until it succeeds or number of retries expires. 
3. Accepts fallback task. If the conditionCheckTask doesn’t return Success even after conditionCheckRetries, the fallbackTask shall be executed.
4. schedules the orchestration returns the created Task Id

## /orchestrator/retrieve-tasks
1.  Accepts taskState(scheduled,running,completed,cancelled,All)
2.  Retrieves a list of tasks based on current status of the task. 
3.  taskState
    1.  All        : retrieves all tasks created by **any** user irrespective of task-state
    2.  scheduled  : retrieves all tasks created by logged in user in scheduled state
    3.  running    : retrieves all tasks created by logged in user in running state
    4.  completed    : retrieves all tasks created by logged in user in completed state
    5.  cancelled  : retrieves all tasks created by logged in user in cancelled state

## /orchestrator/cancel
1.  Accepts taskId of the task to be cancelled
2.  Only the orchestrations in scheduled state can be cancelled i.e first task has not executed yet.
2.  It cancels task and Returns a boolean value to confirm the task has been cancelled, else returns that task cannot be cancelled.

