/**
 * ============================================================================
 * BACKEND SERVER - HỆ THỐNG QUẢN LÝ THU CHI CÁ NHÂN (FINTRACK SMART WALLET)
 * Sinh viên: Vương Thị Anh - MSSV: 31241025843
 * Kiến trúc: Node.js Pure HTTP Server + RESTful API + JSON Database Persistence
 * ============================================================================
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const PORT = 3000;
const DB_PATH = path.join(__dirname, 'database', 'db.json');
const PUBLIC_DIR = path.join(__dirname, 'public');

function readDatabase() {
    try {
        const content = fs.readFileSync(DB_PATH, 'utf8');
        return JSON.parse(content);
    } catch (error) {
        return {
            user: { fullName: "Vương Thị Anh", studentCode: "31241025843", monthlyBudgetLimit: 6500000 },
            transactions: []
        };
    }
}

function writeDatabase(data) {
    fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), 'utf8');
}

function sendJSON(res, statusCode, payload) {
    res.writeHead(statusCode, {
        'Content-Type': 'application/json; charset=utf-8',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
    });
    res.end(JSON.stringify(payload));
}

function parseRequestBody(req) {
    return new Promise((resolve, reject) => {
        let raw = '';
        req.on('data', chunk => { raw += chunk.toString(); });
        req.on('end', () => {
            try {
                resolve(raw ? JSON.parse(raw) : {});
            } catch (err) {
                reject(err);
            }
        });
    });
}

const MIME_TYPES = {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.svg': 'image/svg+xml'
};

const server = http.createServer(async (req, res) => {
    const parsedUrl = url.parse(req.url, true);
    const pathname = parsedUrl.pathname;
    const method = req.method;

    if (method === 'OPTIONS') {
        res.writeHead(204, {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type'
        });
        return res.end();
    }

    // ==================== RESTFUL API ENDPOINTS ====================
    // 1. Lấy toàn bộ dữ liệu giao dịch & ngân sách
    if (pathname === '/api/transactions' && method === 'GET') {
        const db = readDatabase();
        return sendJSON(res, 200, { success: true, data: db });
    }

    // 2. Thêm mới giao dịch Thu / Chi
    if (pathname === '/api/transactions' && method === 'POST') {
        try {
            const body = await parseRequestBody(req);
            if (!body.title || !body.amount || Number(body.amount) <= 0) {
                return sendJSON(res, 400, { success: false, message: 'Vui lòng nhập đầy đủ tên và số tiền hợp lệ!' });
            }
            const db = readDatabase();
            const newItem = {
                id: 'GD-' + Math.floor(100000 + Math.random() * 900000),
                title: String(body.title).trim(),
                category: body.category || 'Khác',
                type: body.type === 'INCOME' ? 'INCOME' : 'EXPENSE',
                amount: Number(body.amount),
                status: ['COMPLETED', 'PENDING', 'CANCELLED'].includes(body.status) ? body.status : 'COMPLETED',
                date: body.date || new Date().toISOString().split('T')[0],
                paymentMethod: body.paymentMethod || 'Chuyển khoản',
                note: body.note ? String(body.note).trim() : ''
            };
            db.transactions.unshift(newItem);
            writeDatabase(db);
            return sendJSON(res, 201, { success: true, message: 'Đã thêm giao dịch mới!', data: newItem });
        } catch (err) {
            return sendJSON(res, 400, { success: false, message: 'Dữ liệu JSON không hợp lệ!' });
        }
    }

    // 3. Chỉnh sửa thông tin giao dịch
    if (pathname.startsWith('/api/transactions/') && !pathname.endsWith('/status') && method === 'PUT') {
        try {
            const id = pathname.split('/')[3];
            const body = await parseRequestBody(req);
            const db = readDatabase();
            const idx = db.transactions.findIndex(item => item.id === id);
            if (idx === -1) {
                return sendJSON(res, 404, { success: false, message: 'Không tìm thấy giao dịch!' });
            }
            db.transactions[idx] = {
                ...db.transactions[idx],
                title: body.title !== undefined ? String(body.title).trim() : db.transactions[idx].title,
                category: body.category !== undefined ? body.category : db.transactions[idx].category,
                type: body.type !== undefined ? body.type : db.transactions[idx].type,
                amount: body.amount !== undefined ? Number(body.amount) : db.transactions[idx].amount,
                status: body.status !== undefined ? body.status : db.transactions[idx].status,
                date: body.date !== undefined ? body.date : db.transactions[idx].date,
                paymentMethod: body.paymentMethod !== undefined ? body.paymentMethod : db.transactions[idx].paymentMethod,
                note: body.note !== undefined ? String(body.note).trim() : db.transactions[idx].note
            };
            writeDatabase(db);
            return sendJSON(res, 200, { success: true, message: 'Cập nhật giao dịch thành công!', data: db.transactions[idx] });
        } catch (err) {
            return sendJSON(res, 400, { success: false, message: 'Lỗi cập nhật dữ liệu!' });
        }
    }

    // 4. Cập nhật nhanh trạng thái giao dịch
    if (pathname.startsWith('/api/transactions/') && pathname.endsWith('/status') && method === 'PATCH') {
        try {
            const id = pathname.split('/')[3];
            const body = await parseRequestBody(req);
            const db = readDatabase();
            const item = db.transactions.find(t => t.id === id);
            if (!item) {
                return sendJSON(res, 404, { success: false, message: 'Không tìm thấy giao dịch!' });
            }
            if (!['COMPLETED', 'PENDING', 'CANCELLED'].includes(body.status)) {
                return sendJSON(res, 400, { success: false, message: 'Trạng thái không hợp lệ!' });
            }
            item.status = body.status;
            writeDatabase(db);
            return sendJSON(res, 200, { success: true, message: 'Đã cập nhật trạng thái!', data: item });
        } catch (err) {
            return sendJSON(res, 400, { success: false, message: 'Lỗi cập nhật trạng thái!' });
        }
    }

    // 5. Xóa giao dịch
    if (pathname.startsWith('/api/transactions/') && method === 'DELETE') {
        const id = pathname.split('/')[3];
        const db = readDatabase();
        const beforeLen = db.transactions.length;
        db.transactions = db.transactions.filter(t => t.id !== id);
        if (db.transactions.length === beforeLen) {
            return sendJSON(res, 404, { success: false, message: 'Không tìm thấy giao dịch cần xóa!' });
        }
        writeDatabase(db);
        return sendJSON(res, 200, { success: true, message: 'Đã xóa giao dịch!' });
    }

    // 6. Cập nhật hạn mức chi tiêu tháng
    if (pathname === '/api/budget' && method === 'PUT') {
        try {
            const body = await parseRequestBody(req);
            const db = readDatabase();
            db.user.monthlyBudgetLimit = Number(body.monthlyBudgetLimit) || 6500000;
            writeDatabase(db);
            return sendJSON(res, 200, { success: true, data: db.user });
        } catch (err) {
            return sendJSON(res, 400, { success: false, message: 'Lỗi cập nhật hạn mức!' });
        }
    }

    // ==================== PHỤC VỤ GIAO DIỆN WEB ====================
    let filePath = pathname === '/' ? path.join(PUBLIC_DIR, 'index.html') : path.join(PUBLIC_DIR, pathname);
    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    fs.readFile(filePath, (err, content) => {
        if (err) {
            res.writeHead(err.code === 'ENOENT' ? 404 : 500, { 'Content-Type': 'text/plain; charset=utf-8' });
            res.end(err.code === 'ENOENT' ? '404 - Không tìm thấy trang' : '500 - Lỗi máy chủ');
        } else {
            res.writeHead(200, { 'Content-Type': contentType });
            res.end(content, 'utf-8');
        }
    });
});

server.listen(PORT, () => {
    console.log('====================================================================');
    console.log('  FINTRACK SMART WALLET - HỆ THỐNG QUẢN LÝ THU CHI ĐÃ SẴN SÀNG!');
    console.log(`  Mở trình duyệt và truy cập: http://localhost:${PORT}`);
    console.log('  Sinh viên thực hiện: Vương Thị Anh - MSSV: 31241025843');
    console.log('====================================================================');
});
