/**
 * Script to test HRappka API connection
 * Run with: node scripts/test-hrappka-connection.mjs
 */

import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env file
dotenv.config({ path: resolve(__dirname, "../.env") });

async function testHRappkaConnection() {
  console.log("🔌 Testing HRappka API connection...\n");

  // Check environment variables
  const baseUrl = process.env.HRAPPKA_BASE_URL;
  const email = process.env.HRAPPKA_EMAIL;
  const password = process.env.HRAPPKA_PASSWORD;
  const companyId = process.env.HRAPPKA_COMPANY_ID;

  console.log("📋 Configuration:");
  console.log(`  Base URL: ${baseUrl || "❌ NOT SET"}`);
  console.log(`  Email: ${email || "❌ NOT SET"}`);
  console.log(`  Password: ${password ? "***" : "❌ NOT SET"}`);
  console.log(`  Company ID: ${companyId || "❌ NOT SET"}\n`);

  if (!baseUrl || !email || !password || !companyId) {
    console.error("❌ Missing required environment variables!");
    console.error("   Please set: HRAPPKA_BASE_URL, HRAPPKA_EMAIL, HRAPPKA_PASSWORD, HRAPPKA_COMPANY_ID");
    process.exit(1);
  }

  try {
    // Test authentication
    console.log("🔐 Testing authentication...");
    const authUrl = `${baseUrl}/api/authenticate`;
    
    // Use https module directly to handle SSL issues
    const https = await import("https");
    const { URL } = await import("url");
    
    const urlObj = new URL(authUrl);
    
    // Create request options
    const requestData = JSON.stringify({
      email,
      password,
      companyId: companyId, // Keep as string if it contains letters
    });
    
    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port || 443,
      path: urlObj.pathname,
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
        "Content-Length": Buffer.byteLength(requestData),
      },
      // WARNING: Only for testing - in production use proper SSL certificates
      rejectUnauthorized: false,
    };
    
    const authResponse = await new Promise((resolve, reject) => {
      const req = https.request(options, (res) => {
        let data = "";
        res.on("data", (chunk) => {
          data += chunk;
        });
        res.on("end", () => {
          resolve({
            ok: res.statusCode >= 200 && res.statusCode < 300,
            status: res.statusCode,
            statusText: res.statusMessage,
            text: async () => data,
            json: async () => JSON.parse(data),
          });
        });
      });
      
      req.on("error", reject);
      req.write(requestData);
      req.end();
    });

    if (!authResponse.ok) {
      const errorText = await authResponse.text();
      console.error(`❌ Authentication failed (${authResponse.status} ${authResponse.statusText}):`);
      console.error(`   ${errorText}`);
      process.exit(1);
    }

    const authData = await authResponse.json();
    
    if (!authData.token) {
      console.error("❌ No token received in authentication response");
      console.error("   Response:", JSON.stringify(authData, null, 2));
      process.exit(1);
    }

    console.log("✅ Authentication successful!");
    console.log(`   Token: ${authData.token.substring(0, 20)}...\n`);

    // Test getting employees (if endpoint is available)
    console.log("👥 Testing employees endpoint...");
    console.log("   Documentation: https://hrappka.docs.apiary.io/#reference/0/employees/get-list");
    const employeesEndpoint = process.env.HRAPPKA_EMPLOYEES_ENDPOINT || "/employees";
    const employeesUrl = new URL(employeesEndpoint, baseUrl);
    
    try {
      const employeesOptions = {
        hostname: employeesUrl.hostname,
        port: employeesUrl.port || 443,
        path: employeesUrl.pathname,
        method: "GET",
        headers: {
          "Accept": "application/json",
          "Authorization": `Bearer ${authData.token}`,
        },
        rejectUnauthorized: false,
      };
      
      const employeesResponse = await new Promise((resolve, reject) => {
        const req = https.request(employeesOptions, (res) => {
          let data = "";
          res.on("data", (chunk) => {
            data += chunk;
          });
          res.on("end", () => {
            resolve({
              ok: res.statusCode >= 200 && res.statusCode < 300,
              status: res.statusCode,
              json: async () => JSON.parse(data),
            });
          });
        });
        
        req.on("error", reject);
        req.end();
      });

      if (employeesResponse.ok) {
        const employeesData = await employeesResponse.json();
        console.log("✅ Employees endpoint accessible!");
        
        // Try to extract employees array
        let employees = [];
        if (Array.isArray(employeesData)) {
          employees = employeesData;
        } else if (employeesData.data && Array.isArray(employeesData.data)) {
          employees = employeesData.data;
        } else if (employeesData.employees && Array.isArray(employeesData.employees)) {
          employees = employeesData.employees;
        }
        
        console.log(`   Found ${employees.length} employees`);
        if (employees.length > 0) {
          console.log(`   First employee: ${employees[0].firstName || ""} ${employees[0].lastName || ""} (ID: ${employees[0].id})`);
        }
      } else {
        console.log(`⚠️  Employees endpoint returned ${employeesResponse.status} (endpoint may need adjustment)`);
        console.log(`   Endpoint: ${employeesEndpoint}`);
        console.log(`   Check documentation: https://hrappka.docs.apiary.io/#`);
        console.log(`   You can set HRAPPKA_EMPLOYEES_ENDPOINT in .env to customize`);
      }
      
      // Test calendar endpoint (for time reports)
      console.log("\n📅 Testing calendar endpoint (for time reports)...");
      if (employees.length > 0) {
        const testEmployeeId = employees[0].id;
        const calendarEndpoint = `/calendar/employee/${testEmployeeId}`;
        const calendarUrl = new URL(calendarEndpoint, baseUrl);
        
        try {
          const calendarOptions = {
            hostname: calendarUrl.hostname,
            port: calendarUrl.port || 443,
            path: calendarUrl.pathname,
            method: "GET",
            headers: {
              "Accept": "application/json",
              "Authorization": `Bearer ${authData.token}`,
            },
            rejectUnauthorized: false,
          };
          
          const calendarResponse = await new Promise((resolve, reject) => {
            const req = https.request(calendarOptions, (res) => {
              let data = "";
              res.on("data", (chunk) => {
                data += chunk;
              });
              res.on("end", () => {
                resolve({
                  ok: res.statusCode >= 200 && res.statusCode < 300,
                  status: res.statusCode,
                  json: async () => JSON.parse(data),
                });
              });
            });
            
            req.on("error", reject);
            req.end();
          });
          
          if (calendarResponse.ok) {
            const calendarData = await calendarResponse.json();
            console.log("✅ Calendar endpoint accessible!");
            console.log(`   Endpoint: ${calendarEndpoint}`);
            console.log(`   Tested with employee ID: ${testEmployeeId}`);
          } else {
            console.log(`⚠️  Calendar endpoint returned ${calendarResponse.status}`);
            console.log(`   Endpoint: ${calendarEndpoint}`);
            console.log(`   This is the endpoint for time reports according to documentation`);
          }
        } catch (error) {
          console.log(`⚠️  Could not test calendar endpoint: ${error.message}`);
        }
      } else {
        console.log("⚠️  Cannot test calendar endpoint - no employees found");
      }
    } catch (error) {
      console.log(`⚠️  Could not test employees endpoint: ${error.message}`);
      console.log(`   This is OK - you may need to adjust the endpoint in .env`);
    }

    console.log("\n✅ HRappka API connection test completed successfully!");
    console.log("   You can now use the mapping functionality in the application.");

  } catch (error) {
    console.error("❌ Error during connection test:", error.message);
    if (error.cause) {
      console.error("   Cause:", error.cause);
    }
    process.exit(1);
  }
}

testHRappkaConnection();

