FROM maven:3.9-eclipse-temurin-25 AS build
WORKDIR /app
COPY pom.xml .
RUN mvn dependency:go-offline -B
COPY src ./src
COPY public ./public
RUN mvn package -DskipTests -B

FROM eclipse-temurin:25-jre
WORKDIR /app
COPY --from=build /app/target/transaction-api-service-1.0.0.jar app.jar
EXPOSE 4000
CMD ["java", "-jar", "app.jar"]
