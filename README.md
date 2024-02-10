# AWS Cost Daily Summary Email

If you don't want to get a heart attack every month-end when the AWS bill comes, then this tool damm good for you! Set up a scheduler to trigger the AWS Lambda function every day to give you a summary of your AWS spending. So good right?

## About 

This is a NodeJS AWS Lambda function. It gets your AWS expenses from Cost Explorer then summarize them by daily usage then sends you an email.

#### Services:
- AWS Lambda
- Amazon SES
- Amazon EventBridge Scheduler

## Instructions
1. Create a new role with `ce.GetCostAndUsage` and `ses.sendEmail` permission.
1. Git clone and run `npm install`, upload the folder to AWS Lambda function (`NodeJS 18`).
1. Set up Environment variables for the function: `emailRec` & `emailSend`.
1. Set up a Scheduler to trigger this Lambda function at time you prefer (i.e. `9 9 * * ? *`).

Eh, ensure you mask sensitive data lah! We ted talk before, security is important hor! 

## Contributions 

If you kaypoh and want to contribute, pull requests are welcome.

## License

This project use [MIT](http://opensource.org/licenses/MIT) license.
