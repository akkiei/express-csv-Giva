const csv = require("fast-csv");
const fs = require("fs");
const axios = require("axios");
// const axiosRetry = require("axios-retry");
// axiosRetry(axios, {
//   retryDelay: axiosRetry.exponentialDelay,
//   retries: 3,
// });

class RetrieveFile {
  constructor() {
    this.postOfficeURL = "https://api.postalpincode.in/pincode/";
      this.deliveryURl =
          "https://jsonplaceholder.typicode.com/todos/1";
    //   "https://api.giva.co/getDeliveryTime?pin=";
    this.pinDeliveryArr = [];
    this.pinPostMap = new Map();
    this.failedRequestCounter = 0;
    this.retry = 5;
    this.finalCsvRows = [
      [
        "Pincode",
        "Name of Post Office",
        "District",
        "State",
        "Expected date of delivery",
      ],
    ];
  }

  async processCSV(filePath) {
    const getPinCodes = await this.getCsv(filePath);
    const throttleFunc = await this.throttle(getPinCodes);
    await throttleFunc();

    return {
      data: this.finalCsvRows,
      failedPin: this.failedRequestCounter,
      successPin: getPinCodes.length - this.failedRequestCounter,
    };
    // make 60 calls per minute to deliveryURL
    // create csv data with
  }

  async getPostOfficeInfo(pincode) {
    let flag = false;
    for (let i = 0; i < this.retry; i++) {
      const poRequest = await axios.default
        .get(this.postOfficeURL + pincode, {
          timeout: 3000,
        })
        .catch((e) => {
          flag = true;
          // console.log(e.response.status);
          console.log("request failed for POFFICE:", pincode);
        });
      //   this.pinPostMap.set(pincode, poRequest.data[0].PostOffice);
      if (poRequest) {
          if (flag) console.log("request Passed for POFFICE:", pincode);
        return poRequest.data[0].PostOffice;
      }
    }
    this.failedRequestCounter++;
    return "";
  }

  async getDeliveryInfo(pincode) {
    let flag = false;
    for (let i = 0; i < this.retry; i++) {
      const req = await axios.default
        .get(this.deliveryURl, { timeout: 3000 })
        // .get(this.deliveryURl + pincode, {
        //   timeout: 3000,
        // })
        .catch((e) => {
          flag = true;
          console.log("request failed for DELIVERY:", pincode);
          //   this.failedRequestCounter++;
        });
      if (req) {
        if (flag) console.log("request Passed for DELIVERY:", pincode);
        return req.data.message || req.data.title;
      }
    }
    this.failedRequestCounter++;
    return "";
  }

  async requestBatch(pinCodeArrTemp) {
    await Promise.allSettled(
      pinCodeArrTemp.map(async (currPinCode) => {
        const currPin = currPinCode[0];
        const responeForPin = await this.getDeliveryInfo(currPin);
        const responseForPO = await this.getPostOfficeInfo(currPin);
        let rowsForSinglePin = [];
        if (Array.isArray(responseForPO) && responseForPO.length > 0) {
          rowsForSinglePin = responseForPO.map((postOffice) => {
            const row = [];
            row.push(currPin);
            row.push(postOffice.Name || "");
            row.push(postOffice.District || "");
            row.push(postOffice.State || "");
            row.push(responeForPin || "");
            return row;
          });
        }
        if (rowsForSinglePin.length > 0) {
          this.finalCsvRows.push(...rowsForSinglePin);
        }
      })
    );
  }

  // make 60 calls per minute
  async throttle(pinCodesArr) {
    let counter = 0;
    const batch = 60;
    const self = this;
    return async function () {
      return new Promise((resolve, reject) => {
        const interval = setInterval(async () => {
          await self.requestBatch(pinCodesArr.slice(counter, counter + batch));
          counter += batch;
          if (counter >= pinCodesArr.length) {
            clearInterval(interval);
            // console.log("clearing interval");
            resolve(self.finalCsvRows);
          } else console.log("sleeping for 1 secs");
        }, 1000);
      });
    };
  }

  getCsv(filePath) {
    return new Promise((resolve, reject) => {
      const fileRows = [];
      try {
        csv
          .parseFile(filePath)
          .on("data", function (data) {
            fileRows.push(data); // push each row
          })
          .on("end", function () {
            fs.unlinkSync(filePath);
            resolve(fileRows);
          });
      } catch (error) {
        reject(new Error("Error in parsing csv"));
      }
    });
  }
}

module.exports = RetrieveFile;
