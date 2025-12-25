import { GoogleGenerativeAI } from "@google/generative-ai";
import { supabase } from "../../../lib/supabase";
import { NextResponse } from "next/server";



export async function POST(req: Request) {
    try {
        const { messages } = await req.json();
        const apiKey = process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY;

        if (!apiKey) {
            return NextResponse.json(
                { error: "Gemini API Key is missing. Please add GEMINI_API_KEY to your environment variables." },
                { status: 500 }
            );
        }

        // --- Data Fetching ---
        // 1. Stats & Basics
        const { data: orders } = await supabase.from("orders").select("total_amount, status");
        const { count: usersCount } = await supabase.from("users").select("*", { count: "exact", head: true });
        const { count: productsCount } = await supabase.from("products").select("*", { count: "exact", head: true });

        // Revenue & Order Breakdown
        let revenue = 0;
        const orderStatusCounts: Record<string, number> = {};
        if (orders) {
            orders.forEach(o => {
                revenue += (o.total_amount || 0);
                const status = o.status || 'unknown';
                orderStatusCounts[status] = (orderStatusCounts[status] || 0) + 1;
            });
        }
        const orderBreakdownContext = Object.entries(orderStatusCounts)
            .map(([status, count]) => `- ${status}: ${count}`)
            .join("\n");

        // 2. Recent Orders
        const { data: recentOrders } = await supabase
            .from("orders")
            .select("order_number, total_amount, status, created_at, user:users(name, email)")
            .order("created_at", { ascending: false })
            .limit(5);

        // 3. Top Products (Simplified aggregation)
        const { data: orderItems } = await supabase
            .from("order_items")
            .select("product_name, quantity");

        const productStats: Record<string, number> = {};
        orderItems?.forEach((item: any) => {
            productStats[item.product_name] = (productStats[item.product_name] || 0) + (item.quantity || 0);
        });

        const topProducts = Object.entries(productStats)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 5)
            .map(([name, count]) => `${name} (${count} sold)`)
            .join(", ");

        // 4. Coupons
        const { data: coupons } = await supabase.from("coupons").select("code, uses_count");
        const topCoupons = (coupons || [])
            .sort((a, b) => (b.uses_count || 0) - (a.uses_count || 0))
            .slice(0, 5)
            .map(c => `${c.code}: ${c.uses_count} uses`)
            .join(", ");

        // 5. Support Tickets
        const { data: tickets } = await supabase.from("support_tickets").select("status, priority");
        let openTickets = 0;
        let urgentTickets = 0;
        tickets?.forEach(t => {
            if (t.status === 'open' || t.status === 'in_progress') openTickets++;
            if (t.priority === 'urgent' && t.status !== 'resolved' && t.status !== 'closed') urgentTickets++;
        });

        // 6. Inventory Alerts (Low Stock)
        const { data: lowStockProducts } = await supabase
            .from("product_variants")
            .select("product_id, sku, quantity, product:products(name)")
            .lt("quantity", 10)
            .limit(10);

        const inventoryAlerts = lowStockProducts?.map((p: any) => {
            const pName = Array.isArray(p.product) ? p.product[0]?.name : p.product?.name;
            return `- ${pName || 'Unknown'} (SKU: ${p.sku}): ${p.quantity} remaining`;
        }).join("\n") || "No low stock alerts.";

        // 7. Vendors
        const { count: pendingVendors } = await supabase
            .from("vendors")
            .select("*", { count: "exact", head: true })
            .eq("is_verified", false);

        // 8. Categories
        const { count: categoriesCount } = await supabase
            .from("categories")
            .select("*", { count: "exact", head: true });

        // 9. Detailed Product Variants (Limit 50 for context window)
        const { data: variants } = await supabase
            .from("product_variants")
            .select(`
                sku, 
                price, 
                quantity, 
                size:sizes(name), 
                color:colors(name), 
                product:products(name)
            `)
            .limit(50); // Fetch top 50 variants to keep context manageable

        const variantList = variants?.map((v: any) => {
            const pName = Array.isArray(v.product) ? v.product[0]?.name : v.product?.name;
            const sizeName = Array.isArray(v.size) ? v.size[0]?.name : v.size?.name;
            const colorName = Array.isArray(v.color) ? v.color[0]?.name : v.color?.name;
            const details = [
                sizeName ? `Size: ${sizeName}` : null,
                colorName ? `Color: ${colorName}` : null
            ].filter(Boolean).join(", ");

            return `- ${pName || 'Unknown'} | SKU: ${v.sku} | Price: ₹${v.price} | Stock: ${v.quantity} ${details ? '| ' + details : ''}`;
        }).join("\n") || "No variant data available.";


        // --- Context Construction ---
        const dataContext = `
    Current Date: ${new Date().toISOString()}
    
    KEY METRICS:
    - Total Revenue: ₹${revenue.toLocaleString()}
    - Total Users: ${usersCount}
    - Total Products: ${productsCount}
    - Total Orders: ${orders ? orders.length : 0}
    - Total Categories: ${categoriesCount}

    ORDER STATUS BREAKDOWN:
    ${orderBreakdownContext}

    SUPPORT SYSTEM:
    - Open/In-Progress Tickets: ${openTickets}
    - Urgent Unresolved Tickets: ${urgentTickets}

    VENDOR STATS:
    - Pending Vendor Approvals: ${pendingVendors || 0}

    INVENTORY ALERTS (< 10 units):
    ${inventoryAlerts}

    RECENT ORDERS (Last 5):
    ${recentOrders?.map(o => {
            // @ts-ignore - Handle user relation type mismatch
            const userObj = Array.isArray(o.user) ? o.user[0] : o.user;
            const userName = userObj?.name || 'Unknown';
            const userEmail = userObj?.email || 'N/A';
            return `- Order #${o.order_number} by ${userName} (${userEmail}): ₹${o.total_amount} [${o.status}] on ${new Date(o.created_at).toLocaleDateString()}`;
        }).join("\n")}

    TOP SELLING PRODUCTS:
    ${topProducts}

    TOP COUPONS:
    ${topCoupons}

    PRODUCT VARIANTS (Sample 50):
    ${variantList}
    `;

        const systemPrompt = `You are an advanced data analyst assistant for the 'Only2U' admin panel. 
    You have access to the following real-time dashboard data:
    ${dataContext}

    Analyze the data holistically to answer user questions. 
    - Highlights critical issues like urgent support tickets, low inventory, or pending approvals.
    - If revenue or order trends look good, mention it.
    - Be proactive: if you see Urgent tickets or Low stock, suggest checking them.
    - You now have access to specific product variant details (Price, SKU, Size, Color). Use this to answer specific product questions.
    - Format your response in clean Markdown.
    `;

        // --- Gemini Call ---
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

        // Convert messages to Gemini format if needed, or just append the last user message to prompt
        // For simplicity in this turn-based api, we might just pass the last message + context
        const userMessage = messages[messages.length - 1].content;

        const result = await model.generateContent([systemPrompt, userMessage]);
        const response = result.response;
        const text = response.text();

        return NextResponse.json({ role: "assistant", content: text });

    } catch (error) {
        console.error("Data Chat Error:", error);
        return NextResponse.json({ error: "Failed to process request" }, { status: 500 });
    }
}
