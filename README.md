# logIO

logIO is a custom Node-Red node to enhance node logging, tracing, debugging and timing.

As the name suggests, logIO node logs INPUT and OUTPUT messages from nodes. Contrary to other nodes out there, you don't have to wire each and every node you want to log directly to logIO, but you can also use it similar to core _catch_ or _status_ components. Of course you can use it also as core _debug_ component with additional improvement here too.
logIO also has an output node, so you can use it in the middle of the flow as it leaves incoming messages intact and just passes them through.

## LogIO properties

![logIO properties](https://github.com/sebenik/node-red-log-io/blob/master/docs/images/logIO-properties.png?raw=true)

- **Name**: Name fo the node
- **Logger**: add custom logger configuration
- **Output:** select to either log whole or part of the message
- **Autostart**: whether or not to start logging by default. If unselected, logging will be paused and can be enabled through incoming message.
- **Mode:** select one of the available modes (inline, wired, group, flow, select, all)
- **Scope:** select to log either only INPUT or both INPUT and OUTPUT messages _(in inline mode only input messages can be logged)_

### Log Modes

logIO supports different modes, where in each, different nodes can be manually or automatically selected and observed for messages.

- **`inline` [default] mode**
In this mode, logIO behaves same as core _debug_ node, where you can pipe other nodes into logIO and input messages will be logged to desired output.
- **`wired` mode**
In this mode, logIO logs messages of all nodes that are in any way connected to logIO node, even if not directly.
- **`group` mode**
In this mode, logIO logs messages of all nodes that are in the same or in a sub group of logIO node.
- **`flow` mode**
In this mode, logIO logs messages of all nodes in the current flow. In this mode you don't have to wire logIO to any other node.
- **`select` mode**
In this mode, logIO logs messages of selected nodes. In this mode you don't have to wire logIO to any other node.
- **`all` mode**
In this mode, logIO logs messages of all nodes. In this mode you don't have to wire logIO to any other node.

## Logger properties

![logger properties](https://github.com/sebenik/node-red-log-io/blob/master/docs/images/logIO-logger-properties.png?raw=true)

- **Name**: Name of the logger
- **Log level**: one of `debug` `info` `warn` `error`
- **UTC:** select if you want log timestamps in UTC instead of local time
- **Log metadata:** select additional data to include in logs
- **Log output:** select output for logs (debugger panel, system console, file, elastic search)

### Log output

logIO currently supports following log outputs (multiple can be selected):

#### File
![file options](https://github.com/sebenik/node-red-log-io/blob/master/docs/images/file-options.png?raw=true)

- **File name**: Name of the lof file. You can add `%DATE%` placeholder, that will be replaced by date pattern specified by **File date pattern**
- **File date pattern**: A string representing the [moment.js date format](http://momentjs.com/docs/#/displaying/format/) to be used for rotating. For example, if your datePattern is simply 'HH' you will end up with 24 log files that are picked up and appended to every day. (default: 'YYYY-MM-DD')
- **Directory**: The directory name to save log files to. If empty, logs will be saved to node-red root directory.
- **JSON**: whether or not to format logs in JSON format
- **Compress**: whether or not to gzip archived log files
- **Max file size** Maximum size of the file after which it will rotate. This can be defined in Bytes, KB, MB or GB.
- **Files to keep** Maximum number of logs to keep. If not set, no logs will be removed. This can be either _number of files_ or _number of days_.


![file output](https://github.com/sebenik/node-red-log-io/blob/master/docs/images/output-file.png?raw=true)

> [!WARNING]
> Have in mind that if you delete of manually save the file that logIO is writing logs to, it might not be recreated. Watcher observing the file changes in not 100% reliable, thus avoid modifying/deleting files that are currently in use by logIO.
>If you delete the active log file and it's not automatically recreated, you'll have to redeploy the flow.

#### Node-Red debugger panel
[no-additional-options]
![debugger output](https://github.com/sebenik/node-red-log-io/blob/master/docs/images/output-debug.png?raw=true)

#### System
![console options](https://github.com/sebenik/node-red-log-io/blob/master/docs/images/console-options.png?raw=true)
- **JSON**: whether or not to format logs in JSON format

![console output](https://github.com/sebenik/node-red-log-io/blob/master/docs/images/output-console.png?raw=true)


#### ElasticSearch
![ElasticSearch options](https://github.com/sebenik/node-red-log-io/blob/master/docs/images/es-options.png?raw=true)
- **URL** Url of ES instance.
- **Username**
- **Password** 
- **Index** Name of the index.

![ElasticSearch output](https://github.com/sebenik/node-red-log-io/blob/master/docs/images/output-es.png?raw=true)

### Log levels

Available log levels: [`error`, `warn`, `info`, `debug`]
Default log level: `debug`

If message doesn't have its own logLevel, it will be assigned one as defined in logIO and always logged. In this case logIO doesn't act as a filter, but only attaches the selected logLevel to the log entry.

Of course more common case is that you want to log you messages based on severity, so if the message contains _\_logIO\__ object with key logLevel set to one of allowed levels, that one will be used for:

- displaying that log level in log entry
- omitting the message from logs, if current message logLevel priority is lower than logIO log level priority

**Example** logIO log level is set to `warn`

This message will be logged.
```JSON
{
  "payload" : "your payload",
  "topic": "your topic",
  "_logIO_" : { "logLevel": "error" }
}
```
This message will be logged.
```JSON
{
  "payload" : "your payload",
  "topic": "your topic",
  "_logIO_" : { "logLevel": "warn" }
}
```
This message will be logged with warn logLevel (same as logIO defined log level)
```JSON
{
  "payload" : "your payload",
  "topic": "your topic",
}
```
This message will NOT be logged.
```JSON
{
  "payload" : "your payload",
  "topic": "your topic",
  "_logIO_" : { "logLevel": "info" }
}
```

## Dynamically controlling logIO node with incoming message

### Activate or deactivate logIO

By default, logIO will log messages of all connected or selected nodes from deploy onward.

You can disable this behavior by deselecting the **Autostart** and activate the logIO node through incoming message.

To activate logging, incoming message should have a _logIO_ object with key `activate` set to `true`.

```JSON
{
  "payload" : "your payload",
  "topic": "your topic",
  "_logIO_" : { "activate": true }
}
```

To deactivate logging, incoming message should have a _\_logIO\__ object with key `activate` set to `false`:

```JSON
{
  "payload" : "your payload",
  "topic": "your topic",
  "_logIO_" : { "activate": false }
}
```

You can also toggle the logging through components button same as in core *debug* component.
Have in mind that those two actions are not the same and for example if you activated the logIO through incoming message but logIO is deactivated in editor, logging will still be paused.


### Specify fileName

**Bellow applies if output is set to `File`.**

By default, logIO will log messages to file name specified in logger properties. But you can also define file name dynamically through incoming message.

To do so, incoming message should have a _\_logIO\__ object with key `fileName` set to the name of desired file.

```JSON
{
  "payload" : "your payload",
  "topic": "your topic",
  "_logIO_" : { "fileName": "logIO-%DATE%.error", logLevel: "error" }
}
```

### Specify dirName

**Bellow applies if output is set to `File`.**

By default, logIO will log messages to directory specified in logger properties. But you can also define directory dynamically through incoming message.

To do so, incoming message should have a _\_logIO\__ object with key `dirName` set to the directory name.

```JSON
{
  "payload" : "your payload",
  "topic": "your topic",
  "_logIO_" : { "dirName": "/var/log/node-red/errors", "fileName": "logIO-%DATE%.error", logLevel: "error" }
}
```