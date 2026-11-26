#!/bin/zsh
cd "${0:A:h}"
echo 'После сообщения о запуске открой http://localhost:8080'
java --add-modules jdk.httpserver src/BudgetApp.java
