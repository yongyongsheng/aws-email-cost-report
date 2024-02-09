import moment from "moment";
import AWS from "aws-sdk";
const bill = new AWS.CostExplorer({ apiVersion: '2017-10-25' })
const ses = new AWS.SES({ apiVersion: '2010-12-01' });

async function sendEmail(to, from, sbj, msg) {
    var params = {
        Destination: {
            ToAddresses: [to]
        },
        Message: {
            Body: {
                Html: {
                    Charset: "UTF-8",
                    Data: msg 
                }
            },
            Subject: {
                Charset: 'UTF-8',
                Data: sbj
            }
        },
        Source: from
    };

    // Create the promise and SES service object 
    try {
        let sq = await ses.sendEmail(params).promise();
        console.log('emailSes', sq)
        return true;
    } catch (error) {
        console.log("Error send SES: ", error);
    }

    return false;
}

export const handler = async (event) => {
  
  const d1 = moment().subtract(1, 'days').startOf('month').format("YYYY-MM-DD");
  const d2 = moment().subtract(1, 'days').format("YYYY-MM-DD");
  const d3 = moment().format("YYYY-MM-DD");
  console.log(d1,d2,d3)
  
  //
  // Get Cost & Usage for MTD
  //
  let costParams = {
    'TimePeriod':{
      'Start': d1,
      'End': d3
    },
    'Granularity': 'DAILY',
    'Metrics': [
      'AmortizedCost'
    ],
    'GroupBy':[
      {
        "Type": "DIMENSION",
        "Key": "LINKED_ACCOUNT"
      }
    ]
  };
  let costResult = await bill.getCostAndUsage(costParams).promise();
  console.log('costResult', costResult)
  
  //
  // Put into readable array
  //
  let dates = [];
  let accounts = [];
  let costByAccount = {};
  let costSummary = {};
  
  for(var i=0; i<costResult.DimensionValueAttributes.length; i++){
    let tmp = costResult.DimensionValueAttributes[i];
    let acct = parseInt(tmp.Value);
    //console.log(tmp.Value,tmp.Attributes.description, tmp);
    accounts.push(acct);
    costByAccount[acct] = {
      "name": tmp.Attributes.description,
      "subtotal": 0,
      "data": {}
    }
  }
  
  let totalCost = 0;
  let lastDayCost = 0;
  for(var i=0; i<costResult.ResultsByTime.length; i++){
    let tmp = costResult.ResultsByTime[i];
    
    let date = tmp.TimePeriod.Start;
    let dd = parseInt(date.replaceAll('-',''));
    if (!(dates.indexOf(date) >= 0)) { 
      dates.push(date);
    }
    
    lastDayCost = 0;
    for(var j=0; j<tmp.Groups.length; j++){
      let acc = parseInt(tmp.Groups[j].Keys[0]);
      let amt = parseFloat(tmp.Groups[j].Metrics.AmortizedCost.Amount);
      
      lastDayCost += amt;
      totalCost += amt; 
      costByAccount[acc].subtotal += amt;
      costByAccount[acc].data[dd] = amt.toFixed(2);
    } 
  }
  
  costSummary['total'] = totalCost.toFixed(2);
  console.log('totalCost', totalCost)
  costSummary['lastDay'] = lastDayCost.toFixed(2);
  console.log('lastDayCost', lastDayCost)
  
  dates.sort();
  dates.reverse();
  console.log('dates', dates.length, dates);
  console.log('costByAccount', JSON.stringify(costByAccount));
  console.log('costSummary', JSON.stringify(costSummary));
  
  //
  // Prepare email table
  //
  let sbj = 'AWS $' + costSummary['lastDay'] + ' on ' + d2;
  let msg = '<h4>MTD Spending: $' + costSummary['total'] + '</h4>';
  msg += '<p>This report is generated for <u>'+d1+'</u> to <u>'+d2+'</u>. The spending on the last day <b>'+d2+'</b> is <b>$'+costSummary['lastDay']+'</b>.<br>See below for daily summary.</p>';
  msg += '<table border=1 cellpadding=2 cellspacing=1>';
  msg += '<tr>';
  msg += '<td>&nbsp;</td>';
  for(var i=0; i<accounts.length; i++){
    msg += '<td><u>' + costByAccount[accounts[i]].name + '</u></td>';
  }
  msg += '</tr>';
  msg += '<tr>';
  msg += '<td>&nbsp;</td>';
  for(var i=0; i<accounts.length; i++){
    msg += '<td align=right><b>$' + costByAccount[accounts[i]].subtotal.toFixed(2) + '</b></td>';
  }
  msg += '</tr>';
  for(var i=0; i<dates.length; i++){
    let dd = parseInt(dates[i].replaceAll('-',''));
    msg += '<tr>';
    msg += '<td>'+ dates[i] +'</td>';
    for(var j=0; j<accounts.length; j++){
      msg += '<td align=right>' + costByAccount[accounts[j]].data[dd] + '</td>';
    }
    msg += '</tr>';
  }
  msg += '</table>';
  
  const emailRecv = process.env.emailRec
  const emailSend = process.env.emailSend
  console.log('sendEmail', emailRecv, sbj, msg)
  await sendEmail(emailRecv, emailSend, sbj, msg);
  
  //
  // Response API
  //
  const response = {
    statusCode: 200,
    body: JSON.stringify({
      "dates": [d1,d2,d3],
      "summary": costSummary,
      "accounts": costByAccount
    }),
  };
  return response;
};
