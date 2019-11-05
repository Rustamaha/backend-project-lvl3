install: install-deps

run:
	DEBUG=page-loader:* npx babel-node -- src/bin/page-loader.js

install-deps:
	npm install

build:
	rm -rf dist
	npm run build

test:
	DEBUG=page-loader:* npm test

testWatch:
	DEBUG=page-loader:* npm run test-watch

lint:
	npx eslint .

publish:
	npm publish --dry-run