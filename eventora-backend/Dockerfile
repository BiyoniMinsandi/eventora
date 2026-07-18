FROM mcr.microsoft.com/dotnet/aspnet:9.0 AS base
WORKDIR /app
EXPOSE 8080

FROM mcr.microsoft.com/dotnet/sdk:9.0 AS build
WORKDIR /src

COPY ["src/Eventora.Api/Eventora.Api.csproj", "src/Eventora.Api/"]
COPY ["src/Eventora.Application/Eventora.Application.csproj", "src/Eventora.Application/"]
COPY ["src/Eventora.Domain/Eventora.Domain.csproj", "src/Eventora.Domain/"]
COPY ["src/Eventora.Infrastructure/Eventora.Infrastructure.csproj", "src/Eventora.Infrastructure/"]

RUN dotnet restore "src/Eventora.Api/Eventora.Api.csproj"

COPY . .

RUN dotnet publish "src/Eventora.Api/Eventora.Api.csproj" \
    -c Release \
    -o /app/publish \
    --no-restore

FROM base AS final
WORKDIR /app
COPY --from=build /app/publish .

ENV ASPNETCORE_URLS=http://+:8080
ENV ASPNETCORE_ENVIRONMENT=Production

ENTRYPOINT ["dotnet", "Eventora.Api.dll"]
