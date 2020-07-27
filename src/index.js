import execa from 'execa';
import { getApi, json, POST } from './fetch';
import QueueClient from './queue-client';

console.log(`HOSTNAME=${process.env.HOSTNAME}`)
console.log(`EXECUTION=${process.env.EXECUTION}`)
console.log(`STAGE=${process.env.STAGE}`)
console.log(`QUEUE=${process.env.QUEUE}`)
console.log(`CALLBACK=${process.env.CALLBACK}`)

const {
    HOSTNAME: containerId,
    EXECUTION: executionId,
    STAGE: stageName,
    QUEUE: queueUrl,   // 'http://localhost:9999/queues'
    CALLBACK: callbackUrl
} = process.env

const client = new QueueClient(`${queueUrl.replace('127.0.0.1', 'host.docker.internal')}/queues`)
const topic = `${executionId}_${stageName}`
const api = getApi(callbackUrl.replace('127.0.0.1', 'host.docker.internal'))

const exec = async shell => {
    try {
        const { stdout } = await execa('sh', ['-c', shell])
        console.log(stdout)
        await api(`client-api/pipe/exec/${executionId}/${stageName}/succeeded`, POST)

    } catch ({ command, exitCode, signal, signalDescription, stderr, failed, timedOut, isCanceled, killed }) {
        console.log(stderr)
        console.log(command)
        await api(`client-api/pipe/exec/${executionId}/${stageName}/failed`, POST, json({
            err: { command, exitCode, signal, signalDescription, stderr, failed, timedOut, isCanceled, killed }
        }))
    }
};
client.connect(async () => {
    await client.subscribe(topic, async ({ data }) => {
        const { msg: { options: { shell } } } = JSON.parse(data)
        await exec(shell)
        client.disconnect()
    })
    await api(`client-api/pipe/exec/${executionId}/${stageName}/ready`, POST)
})
