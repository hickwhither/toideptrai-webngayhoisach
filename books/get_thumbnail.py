import os
from pdf2image import convert_from_path

def convert_with_custom_path():
    # 1. Xác định đường dẫn thư mục thumbnail (nhảy ra ngoài 1 cấp rồi vào folder thumbnail)
    # .. đại diện cho thư mục cha (folder trước đó)
    output_dir = os.path.join('..', 'thumbnail')
    
    # Tạo thư mục nếu nó chưa tồn tại để tránh lỗi
    if not os.path.exists(output_dir):
        os.makedirs(output_dir)
        print(f"Đã tạo thư mục mới tại: {output_dir}")

    # Lấy danh sách file PDF trong folder hiện tại
    files = [f for f in os.listdir('.') if f.lower().endswith('.pdf')]
    
    # Đường dẫn Poppler (điều chỉnh cho đúng với máy của bạn)
    poppler_path = r"C:\Users\ADMIN\Downloads\poppler-25.12.0\Library\bin"

    for pdf_file in files:
        try:
            print(f"Đang xử lý: {pdf_file}...")
            
            # Lấy tên file không có đuôi .pdf
            file_name_only = os.path.splitext(pdf_file)[0]
            
            # Kết hợp đường dẫn: ../thumbnail/tên_file.jpg
            output_name = os.path.join(output_dir, file_name_only + ".jpg")
            
            # Chuyển đổi
            images = convert_from_path(
                pdf_file, 
                first_page=1, 
                last_page=1, 
                dpi=200, 
                poppler_path=poppler_path
            )
            
            if images:
                images[0].save(output_name, 'JPEG')
                print(f"--- Đã lưu ảnh vào: {output_name}")
                
        except Exception as e:
            print(f"Lỗi với file {pdf_file}: {e}")

if __name__ == "__main__":
    convert_with_custom_path()