# Deploy to SAP BTP Cloud Foundry

## Prerequisites
- CF CLI installed: https://docs.cloudfoundry.org/cf-cli/install-go-cli.html
- BTP account with CF space access

## Steps

### 1. Login to CF
```
cf login -a https://api.cf.eu10.hana.ondemand.com -u anita.dixit@sap.com
```
When prompted, select:
- Org: gdapacenr-orgad1
- Space: adspace

### 2. Go to the app folder
```
cd assets/ai-adoption-tracker-cap
```

### 3. Push the app
```
cf push
```

### 4. Get your URL
```
cf app ai-adoption-tracker
```
Look for the **routes** line — that's your public URL!

## Done!
Share that URL with your colleagues.
