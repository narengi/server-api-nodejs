#!/usr/bin/env node

//
// Author : Ali Abbasinasab (a.abbasinasab@gmail.com)
//

var spawn = require('cross-spawn');

if (process.argv.length < 3) {
	console.log('Wrong argunemt');
	console.log('Usage : node reinstall <pkg>');
	return;
}

var userArgs = process.argv.slice(2);
var packageName = userArgs[0];

console.log('\nUninstalling package \'%s\' ...', packageName);

spawn('npm', ['uninstall', packageName], {
		stdio: ['pipe', 'pipe', process.stderr]
	})
	.on('close', function() {

		console.log('Installing %s ...', packageName);

		spawn('npm', ['install', packageName], {
				stdio: ['pipe', 'pipe', process.stderr]
			})
			.on('close', function(err) {

				var msg = '\'' + packageName + '\' installed';

				if (err) {
					msg = 'An error occured!';
				}

				console.log('\n' + msg + '\n');
			});
	});