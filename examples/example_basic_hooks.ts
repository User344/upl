import * as upl from 'pengu-upl';

export function init(context: any) {
	// Initialize the UPL context
	upl.init(context);

	// Hook WebSocket to change chat status to offline
	upl.hooks.ws.hook('/lol-chat/v1/me', (content, original) => {
		console.log('Received WebSocket message on /lol-chat/v1/me:', content);

		// Set the chat status to offline
		content.availability = 'offline';
		original(content);
	});

	// Hook XHR request to modify the response for '/deep-links/v1/settings'
	upl.hooks.xhr.hookPost('/deep-links/v1/settings', (xhr, original) => {
		console.log('XHR request to /deep-links/v1/settings:', xhr);

		// Modify the response to disable the Legends of Runeterra (LoR) button
		const modifiedResponse = JSON.stringify({
			externalClientScheme: 'riotclient',
			isSchemeReady: true,
			launchLorEnabled: false,
			launchLorUrl: '/product/launch/v1/bacon'
		});
		Object.defineProperty(xhr, 'responseText', { writable: true, value: modifiedResponse });
		original();
	});

	// Hook 'runTask' method to set ARAM champion bench swap delay to 0
	// Function adapted from: https://github.com/BakaFT/BenchKiller
	function hookRunTask(componentName: string) {
		upl.hooks.ember.hookComponentMethodByName(componentName, 'runTask', (ember, originalMethod, ...args) => {
			console.log(`Hooked runTask in ${componentName} component.`, args);

			// Set delay to 0 if applicable
			if (args.length > 1) {
				args[1] = 0;
			}

			return originalMethod(...args);
		});
	}

	// Apply 'runTask' hook for both 'champion-bench' and 'champion-bench-item'
	hookRunTask('champion-bench');
	hookRunTask('champion-bench-item');
}
