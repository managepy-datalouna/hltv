import { 
    SERVER_HOST, 
    SERVER_PORT,
    PROXY_LIST,
    PROXY_TIMEOUT,
    PROXY_SLEEPING_TIME,
    LOGFILE,
    HTLV_URL,
} from './config.js';
import express from 'express';
import got from 'got';
import winston from 'winston';

const app = express();
const proxies = [];
const { combine, timestamp, printf } = winston.format;

const logger_format = printf(({ level, message, timestamp }) => {
    return `${timestamp} ${level}: ${message}`;
});
const logger = winston.createLogger({
    format: combine(
        timestamp(),
        logger_format,
    ),
    transports: [
        new winston.transports.Console(),
        new winston.transports.File({ filename: LOGFILE }),
    ],
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/', (_request, response) => {
    send_to_proxy(PROXY_TIMEOUT).then((hltv_response) => {
        response.send(hltv_response);
    });
});

app.listen(SERVER_PORT, SERVER_HOST, () => {
    console.log(
        `Server is running on ${SERVER_HOST}:${SERVER_PORT}`,
    );
});


function send_to_proxy(timeout) {
    return new Promise(resolve => {
        let proxy_index = null;

        const send_request_to_proxy = setInterval(async () => {
            proxy_index = enqueue_proxy();

            if (proxy_index !== null) {
                logger.info(
                    `REQUEST_TO: ${PROXY_LIST[proxy_index]}`,
                );

                try {
                    const data = await send_request(
                        proxy_index,
                    );
                    logger.info(
                        `RESPONSE: ${data}, FROM: ${PROXY_LIST[proxy_index]}`,
                    );
                    clearInterval(send_request_to_proxy);
                    resolve(data);
                } catch (error) {
                    logger.error(`SENDING REQUEST ERROR: ${error}`);
                } finally {
                    sleep(PROXY_SLEEPING_TIME).then(() => {
                        proxies.splice(proxies.indexOf(proxy_index), 1);
                    });
                }
            }
        }, timeout);
    });
}

async function send_request(proxy_index) {
    const {data} = await got(`${PROXY_LIST[proxy_index]}`, {
        method: 'POST',
        json: {
            method: 'GET', 
            hltv_url: HTLV_URL,
        }, 
    }).json();
    return data;
}

function enqueue_proxy() {
    if (proxies.length !== PROXY_LIST.length) {

        for (let proxy_index in PROXY_LIST) {

            if (!proxies.includes(proxy_index)) {
                proxies.push(proxy_index);
                return proxy_index;
            }
        }
    }

    return null;
}

function sleep(milliseconds) {
    return new Promise(
        resolve => setTimeout(resolve, milliseconds),
    );
}
