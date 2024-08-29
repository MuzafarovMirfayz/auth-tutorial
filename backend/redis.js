import { createClient } from 'redis';

const redis = createClient({
    password: process.env.REDIS_PASS,
    socket: {
        host: process.env.REDIS,
        port: process.env.REDIS_PORT
    }
});


export default redis