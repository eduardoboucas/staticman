include config.mk

all: push-to-heroku test-connection

push-to-heroku:
	@git push -f heroku master

create-ssh-key:
	@ssh-keygen -m PEM -t rsa -b 4096 -C "staticman" -f id_rsa

create-heroku:
	@heroku create $(APP_NAME)

config-heroku:
	@heroku config:add "RSA_PRIVATE_KEY='$(shell cat id_rsa | tr -d "\n")'" "GITHUB_TOKEN=$(GITHUB_TOKEN)"
	@heroku ps:scale web=1

test-connection:
	@curl -I https://$(APP_NAME).herokuapp.com/ 2>/dev/null | head -n 1

setup: create-ssh-key create-heroku push-to-heroku config-heroku test-connection

destroy:
	@heroku apps:destroy --confirm $(APP_NAME)

PHONY: all create-ssh-key create-heroku push-to-heroku config-heroku test-connection setup destroy
