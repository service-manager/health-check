# Health Check
## @service-manager/health-check

Node.js Health Check Utility


### Example Usage

```typescript
import {HealthCheck, HealthCheckEventPayload} from "@service-manager/health-check";

const callback = async() => {
    // perform async health check 
    return true;
}

const options: HealthCheckOptions = {
    interval: 1000, // check every second
    timeout: 500 // timeout after half second
}

const healthCheck = new HealthCheck(callback, options);

healthCheck.on('up', (event: HealthCheckEvent) => {
    console.log(new Date(), 'healthy');
})

healthCheck.on('down', (event: HealthCheckEvent) => {
    console.log(new Date(), 'unhealthy');
})

healthCheck.on('change', (event: HealthCheckEvent) => {
    console.log(new Date(), 'change', event);
});

healthCheck.start();

```

### Alternate Syntax

```typescript
new HealthCheck({
    start: true, // auto start
    interval: 1000, // check every second
    timeout: 500, // timeout after half second
    callback: async () => {
        // perform async health check
        return true; // return boolean;
    },
    onUp: (event: HealthCheckEventPayload) => {
        console.log(new Date(), 'healthy', event);
    },
    onDown: (event: HealthCheckEventPayload) => {
        console.log(new Date(), 'unhealthy', event)
    },
    onChange: (event: HealthCheckEventPayload) => {
        console.log(new Date(), 'change', event);
    }
});
```
