const HealthCheck = require("@service-manager/health-check");

const healthCheck = new HealthCheck(async() => {
    return getRandomResult();
}, {
    interval: 1000, // check every second
    timeout: 500 // timeout after half second
});


healthCheck.on('up', () => {
    console.log(new Date(), 'healthy');
})

healthCheck.on('down', () => {
    console.log(new Date(), 'unhealthy');
})

healthCheck.on('change', (event) => {
    console.log(new Date(), 'change', event);
});

healthCheck.on('result', (event) => {
    console.log(new Date(), 'result', event);
});

healthCheck.on('timeout', (event) => {
    console.log(new Date(), 'timeout', event);
});


healthCheck.start();




const getRandomResult = () => {
    const random = Math.random();
    console.log(new Date(), 'random', random);

    // return true 85% of the time
    if (random <= 0.85)
        return true;

    // return false 10 % of the time
    if (random <= 0.95)
        return false;

    // timeout (promise resolves after one second before check timeout)
    return new Promise((resolve, reject)=> {
        setTimeout(() => {
            resolve("timeout");
        }, 1000);
    })

}
