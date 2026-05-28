// Azure Container Apps deployment for Nura Space.
// Creates: Log Analytics, Container Apps Environment, user-assigned identity (with AcrPull),
// and two Container Apps — nura-server (internal-only) and nura-client (public).

param location string = resourceGroup().location

@description('Short unique suffix used in resource names, e.g. initials + 4 digits.')
param suffix string

@description('Existing Azure Container Registry name (in this resource group).')
param acrName string

@description('Fully qualified server image, e.g. myacr.azurecr.io/nura-server:abc1234')
param serverImage string

@description('Fully qualified client image, e.g. myacr.azurecr.io/nura-client:abc1234')
param clientImage string

@secure()
param jwtSecret string

@secure()
param owmApiKey string

resource law 'Microsoft.OperationalInsights/workspaces@2022-10-01' = {
  name: 'law-nura-${suffix}'
  location: location
  properties: {
    sku: { name: 'PerGB2018' }
    retentionInDays: 30
  }
}

resource env 'Microsoft.App/managedEnvironments@2024-03-01' = {
  name: 'cae-nura-${suffix}'
  location: location
  properties: {
    appLogsConfiguration: {
      destination: 'log-analytics'
      logAnalyticsConfiguration: {
        customerId: law.properties.customerId
        sharedKey: law.listKeys().primarySharedKey
      }
    }
  }
}

resource acr 'Microsoft.ContainerRegistry/registries@2023-07-01' existing = {
  name: acrName
}

resource uami 'Microsoft.ManagedIdentity/userAssignedIdentities@2023-01-31' = {
  name: 'uami-nura-${suffix}'
  location: location
}

// AcrPull role on the registry — lets the user-assigned identity pull images.
resource acrPull 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(acr.id, uami.id, 'acrpull')
  scope: acr
  properties: {
    principalId: uami.properties.principalId
    principalType: 'ServicePrincipal'
    roleDefinitionId: subscriptionResourceId(
      'Microsoft.Authorization/roleDefinitions',
      '7f951dda-4ed3-4680-a7ca-43fe172d538d'
    )
  }
}

resource server 'Microsoft.App/containerApps@2024-03-01' = {
  name: 'nura-server'
  location: location
  identity: {
    type: 'UserAssigned'
    userAssignedIdentities: {
      '${uami.id}': {}
    }
  }
  properties: {
    managedEnvironmentId: env.id
    configuration: {
      // Internal-only ingress: not reachable from the public internet,
      // only from other apps in the same Container Apps Environment.
      ingress: {
        external: false
        targetPort: 3001
        transport: 'auto'
      }
      registries: [
        {
          server: acr.properties.loginServer
          identity: uami.id
        }
      ]
      secrets: [
        { name: 'jwt-secret', value: jwtSecret }
        { name: 'owm-api-key', value: owmApiKey }
      ]
    }
    template: {
      containers: [
        {
          name: 'server'
          image: serverImage
          resources: {
            cpu: json('0.5')
            memory: '1Gi'
          }
          env: [
            { name: 'PORT', value: '3001' }
            { name: 'NODE_ENV', value: 'production' }
            { name: 'JWT_SECRET', secretRef: 'jwt-secret' }
            { name: 'OWM_API_KEY', secretRef: 'owm-api-key' }
            // CORS origin = public URL of the client app, derived from env's default domain.
            { name: 'CLIENT_ORIGIN', value: 'https://nura-client.${env.properties.defaultDomain}' }
          ]
          probes: [
            {
              type: 'Liveness'
              httpGet: { path: '/api/health', port: 3001 }
              periodSeconds: 30
            }
            {
              type: 'Readiness'
              httpGet: { path: '/api/health', port: 3001 }
              periodSeconds: 10
            }
          ]
        }
      ]
      scale: {
        // minReplicas=1 keeps WebSocket connections alive across the scale floor.
        minReplicas: 1
        maxReplicas: 2
      }
    }
  }
  dependsOn: [acrPull]
}

resource client 'Microsoft.App/containerApps@2024-03-01' = {
  name: 'nura-client'
  location: location
  identity: {
    type: 'UserAssigned'
    userAssignedIdentities: {
      '${uami.id}': {}
    }
  }
  properties: {
    managedEnvironmentId: env.id
    configuration: {
      ingress: {
        external: true
        targetPort: 80
        transport: 'auto'
      }
      registries: [
        {
          server: acr.properties.loginServer
          identity: uami.id
        }
      ]
    }
    template: {
      containers: [
        {
          name: 'client'
          image: clientImage
          resources: {
            cpu: json('0.25')
            memory: '0.5Gi'
          }
          env: [
            // nginx upstream — ACA's internal DNS resolves bare app names within an env.
            { name: 'SERVER_HOST', value: 'nura-server' }
          ]
        }
      ]
      scale: {
        minReplicas: 1
        maxReplicas: 2
      }
    }
  }
  dependsOn: [server]
}

output clientUrl string = 'https://${client.properties.configuration.ingress.fqdn}'
output serverInternalFqdn string = server.properties.configuration.ingress.fqdn
