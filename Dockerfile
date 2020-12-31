# FROM node:8.6.0
FROM flaviostutz/puppeteer-runner:1.0.0

RUN curl -LJ -o /bin/promgrep https://github.com/stutzlab/promgrep/releases/download/v1.2.1/promgrep-linux-amd64 && chmod +x /bin/promgrep

EXPOSE 8880

ENV APP_ALUNOS_URL ''
ENV APP_BACKEND_URL ''
ENV TAKE_SCREENSHOTS_CHANCE '100'
ENV RUN_PARALLEL_USERS '1'
ENV TIME_BETWEEN_NEW_USERS '0'
ENV TIME_BETWEEN_NEW_TESTS '1.0'
ENV CLICK_ANTERIOR_CHANCE '0'
ENV TEST_ID ''
ENV JEST_MAX_CONCURRENCY '1'
ENV MIN_QUESTION_TIME '40000'
ENV MAX_QUESTION_TIME '90000'
ENV FORCE_USER_CREATION 'false'
ENV PERFORM_SCROLL 'true'
ENV CONSUL_HOST ''
ENV PROMGREP_OUTPUT 'all'

RUN mkdir /app/screenshots
ADD /__tests__ /app/__tests__

RUN npm install --save node-fetch

ADD jest.config.js /app/
ADD jest.setup.js /app/
ADD jest.teardown.js /app/
ADD jest.environment.js /app/
ADD launch_resolve_estudantes_tests.sh /
ADD startmonitored_resolve_estudantes.sh /
ADD showusers.sh /
ADD exitfinished.sh /
ADD startup.sh /

VOLUME [ "/data" ]

CMD [ "/startup.sh" ]

