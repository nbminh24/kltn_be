/**
 * DEBUG SCRIPT: Check Customer Token & Status
 * Usage: npx ts-node scripts/debug-customer-token.ts
 */

import 'dotenv/config';
import { createConnection } from 'typeorm';
import * as jwt from 'jsonwebtoken';
import { Customer } from '../src/entities/customer.entity';

async function debugCustomerToken() {
    console.log('🔍 Debugging Customer Token...\n');

    // Get token from command line
    const token = process.argv[2];

    if (!token) {
        console.error('❌ Usage: npx ts-node scripts/debug-customer-token.ts <access_token>');
        process.exit(1);
    }

    try {
        // 1. Decode token
        console.log('📋 Step 1: Decoding token...');
        const decoded: any = jwt.decode(token);

        if (!decoded) {
            console.error('❌ Cannot decode token - Invalid format');
            process.exit(1);
        }

        console.log('✅ Token decoded successfully:');
        console.log('   - Customer ID:', decoded.sub);
        console.log('   - Email:', decoded.email);
        console.log('   - Issued At:', new Date(decoded.iat * 1000).toISOString());
        console.log('   - Expires At:', new Date(decoded.exp * 1000).toISOString());

        const now = Math.floor(Date.now() / 1000);
        const remainingSeconds = decoded.exp - now;
        const remainingMinutes = Math.floor(remainingSeconds / 60);

        console.log('   - Remaining Time:', remainingMinutes, 'minutes', remainingSeconds % 60, 'seconds');

        if (remainingSeconds <= 0) {
            console.log('   ⚠️  TOKEN EXPIRED!');
        } else if (remainingMinutes < 5) {
            console.log('   ⚠️  Token expires soon!');
        }

        // 2. Verify token signature
        console.log('\n📋 Step 2: Verifying token signature...');
        const JWT_SECRET = process.env.JWT_SECRET;

        if (!JWT_SECRET) {
            console.error('❌ JWT_SECRET not found in environment');
            process.exit(1);
        }

        try {
            jwt.verify(token, JWT_SECRET);
            console.log('✅ Token signature is VALID');
        } catch (verifyError: any) {
            console.error('❌ Token signature INVALID:', verifyError.message);
            if (verifyError.name === 'TokenExpiredError') {
                console.error('   → Token has expired');
            } else if (verifyError.name === 'JsonWebTokenError') {
                console.error('   → JWT_SECRET mismatch or malformed token');
            }
            // Continue to check customer status anyway
        }

        // 3. Connect to database
        console.log('\n📋 Step 3: Connecting to database...');

        const connection = await createConnection({
            type: 'postgres',
            url: process.env.DATABASE_URL,
            entities: [Customer],
            synchronize: false,
        });

        console.log('✅ Connected to database');

        // 4. Check customer status
        console.log('\n📋 Step 4: Checking customer status...');

        const customerRepo = connection.getRepository(Customer);
        const customer = await customerRepo.findOne({
            where: { id: decoded.sub },
        });

        if (!customer) {
            console.error('❌ Customer NOT FOUND in database!');
            console.error('   → Customer may have been deleted');
            await connection.close();
            process.exit(1);
        }

        console.log('✅ Customer found:');
        console.log('   - ID:', customer.id);
        console.log('   - Email:', customer.email);
        console.log('   - Name:', customer.name);
        console.log('   - Status:', customer.status);
        console.log('   - Email Verified:', customer.email_verified);
        console.log('   - Created At:', customer.created_at);
        console.log('   - Last Login:', customer.last_login_at);

        // 5. Validate status
        console.log('\n📋 Step 5: Validating status...');

        if (customer.status !== 'active') {
            console.error('❌ Customer status is NOT ACTIVE:', customer.status);
            console.error('   → This will cause 401 Unauthorized');
            console.error('   → Fix: Update customer status to "active"');
        } else {
            console.log('✅ Customer status is ACTIVE');
        }

        // 6. Summary
        console.log('\n' + '='.repeat(60));
        console.log('📊 DIAGNOSTIC SUMMARY');
        console.log('='.repeat(60));

        const issues: string[] = [];

        if (remainingSeconds <= 0) {
            issues.push('🔴 Token has EXPIRED');
        } else if (remainingMinutes < 5) {
            issues.push('🟡 Token expires in less than 5 minutes');
        }

        if (customer.status !== 'active') {
            issues.push('🔴 Customer status is NOT active');
        }

        if (!customer.email_verified) {
            issues.push('🟡 Email not verified');
        }

        if (issues.length === 0) {
            console.log('✅ NO ISSUES FOUND - Token should work normally');
            console.log('   → Problem may be in frontend or network');
        } else {
            console.log('❌ ISSUES FOUND:');
            issues.forEach(issue => console.log('   ' + issue));
        }

        await connection.close();
        console.log('\n✅ Debug complete\n');

    } catch (error: any) {
        console.error('\n❌ Error during debug:', error.message);
        console.error(error.stack);
        process.exit(1);
    }
}

debugCustomerToken();
