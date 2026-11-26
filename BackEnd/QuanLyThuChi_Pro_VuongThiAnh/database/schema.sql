-- ============================================================================
-- CƠ SỞ DỮ LIỆU HỆ THỐNG QUẢN LÝ THU CHI CÁ NHÂN (FINTRACK SMART WALLET)
-- Sinh viên thực hiện: Vương Thị Anh - MSSV: 31241025843
-- ============================================================================

CREATE DATABASE IF NOT EXISTS FinTrack_Expense_DB CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE FinTrack_Expense_DB;

-- 1. Bảng Tài khoản Người dùng (Users)
CREATE TABLE Users (
    UserID INT PRIMARY KEY AUTO_INCREMENT,
    FullName NVARCHAR(100) NOT NULL,
    StudentCode VARCHAR(20) UNIQUE,
    Email VARCHAR(100) UNIQUE NOT NULL,
    MonthlyBudgetLimit DECIMAL(15, 2) DEFAULT 6000000.00,
    CreatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 2. Bảng Danh mục Thu / Chi (Categories)
CREATE TABLE Categories (
    CategoryID INT PRIMARY KEY AUTO_INCREMENT,
    CategoryName NVARCHAR(60) NOT NULL,
    FlowType ENUM('INCOME', 'EXPENSE') NOT NULL,
    ColorHex VARCHAR(10) DEFAULT '#0f766e'
);

-- 3. Bảng Sổ cái Giao dịch Thu / Chi (Transactions)
CREATE TABLE Transactions (
    TransactionID VARCHAR(20) PRIMARY KEY,
    UserID INT NOT NULL,
    CategoryID INT NOT NULL,
    Title NVARCHAR(200) NOT NULL,
    Amount DECIMAL(15, 2) NOT NULL CHECK (Amount > 0),
    FlowType ENUM('INCOME', 'EXPENSE') NOT NULL,
    Status ENUM('COMPLETED', 'PENDING', 'CANCELLED') DEFAULT 'COMPLETED',
    TransactionDate DATE NOT NULL,
    PaymentMethod NVARCHAR(50) DEFAULT N'Chuyển khoản',
    Note NVARCHAR(500),
    CreatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    UpdatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (UserID) REFERENCES Users(UserID) ON DELETE CASCADE,
    FOREIGN KEY (CategoryID) REFERENCES Categories(CategoryID)
);

-- ============================================================================
-- DỮ LIỆU MẪU KHỞI TẠO (SEED DATA)
-- ============================================================================
INSERT INTO Users (FullName, StudentCode, Email, MonthlyBudgetLimit)
VALUES (N'Vương Thị Anh', '31241025843', 'vuongthianh.31241025843@st.ueh.edu.vn', 6500000.00);

INSERT INTO Categories (CategoryName, FlowType, ColorHex) VALUES
(N'Lương & Thưởng', 'INCOME', '#059669'),
(N'Kinh doanh & Bán hàng', 'INCOME', '#10b981'),
(N'Học bổng & Trợ cấp', 'INCOME', '#34d399'),
(N'Đầu tư & Lãi tiết kiệm', 'INCOME', '#0d9488'),
(N'Ăn uống & Cafe', 'EXPENSE', '#f59e0b'),
(N'Nhà ở & Điện nước', 'EXPENSE', '#ef4444'),
(N'Di chuyển & Xăng xe', 'EXPENSE', '#3b82f6'),
(N'Học tập & Sách vở', 'EXPENSE', '#6366f1'),
(N'Mua sắm & Giải trí', 'EXPENSE', '#ec4899');

INSERT INTO Transactions (TransactionID, UserID, CategoryID, Title, Amount, FlowType, Status, TransactionDate, PaymentMethod, Note) VALUES
('GD-202601', 1, 3, N'Trợ cấp sinh hoạt phí tháng 11', 3500000, 'INCOME', 'COMPLETED', '2026-11-01', N'Chuyển khoản ngân hàng', N'Gia đình chuyển đầu tháng'),
('GD-202602', 1, 2, N'Doanh thu bán hàng online đợt 1', 2950000, 'INCOME', 'COMPLETED', '2026-11-04', N'Ví MoMo / Vietcombank', N'Đã tất toán đơn hàng'),
('GD-202603', 1, 6, N'Thanh toán tiền thuê nhà & điện nước', 2600000, 'EXPENSE', 'COMPLETED', '2026-11-05', N'Chuyển khoản ngân hàng', N'Hóa đơn cố định tháng 11'),
('GD-202604', 1, 5, N'Ăn trưa & cafe học nhóm cuối tuần', 215000, 'EXPENSE', 'COMPLETED', '2026-11-09', N'Tiền mặt', N'Quán cafe gần trường'),
('GD-202605', 1, 8, N'Mua giáo trình & in ấn tài liệu học tập', 165000, 'EXPENSE', 'COMPLETED', '2026-11-12', N'Ví MoMo', N'Tài liệu chuyên ngành'),
('GD-202606', 1, 9, N'Mua sắm vật dụng cá nhân & mỹ phẩm', 480000, 'EXPENSE', 'COMPLETED', '2026-11-16', N'Thẻ tín dụng', N'Săn sale giữa tháng'),
('GD-202607', 1, 7, N'Đặt vé xe khứ hồi về quê cuối tuần', 320000, 'EXPENSE', 'PENDING', '2026-11-27', N'Ví ZaloPay', N'Chờ xác nhận xuất vé'),
('GD-202608', 1, 1, N'Thù lao dự án Freelance thiết kế', 1500000, 'INCOME', 'PENDING', '2026-11-29', N'Chuyển khoản ngân hàng', N'Đang chờ nghiệm thu thanh toán');
