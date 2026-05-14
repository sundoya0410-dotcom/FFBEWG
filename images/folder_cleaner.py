import os
import tkinter as tk
from tkinter import filedialog, messagebox

class FolderRenameApp:
    def __init__(self, root):
        self.root = root
        self.root.title("폴더 이름 공백 ➔ 언더바(_) 자동 치환기")
        self.root.geometry("500x250")
        self.root.resizable(False, False)
        
        self.target_path = tk.StringVar()
        
        # UI 레이아웃
        padding_frame = tk.Frame(root, padx=20, pady=20)
        padding_frame.pack(fill=tk.BOTH, expand=True)
        
        tk.Label(padding_frame, text="1. 정리할 최상위 폴더를 선택하세요:", font=("Arial", 10, "bold")).pack(anchor="w")
        
        folder_frame = tk.Frame(padding_frame)
        folder_frame.pack(fill=tk.X, pady=(5, 15))
        
        tk.Entry(folder_frame, textvariable=self.target_path, width=40, state="readonly").pack(side=tk.LEFT)
        tk.Button(folder_frame, text="폴더 찾기", command=self.select_folder, bg="#e0e0e0").pack(side=tk.RIGHT)
        
        info_text = "※ 이 프로그램은 모든 하위 폴더를 뒤져서\n폴더 이름의 '띄어쓰기'를 '_'로 바꿉니다.\n(예: FF7 Zack -> FF7_Zack)"
        tk.Label(padding_frame, text=info_text, justify=tk.LEFT, fg="#666666", bg="#f8f9fa", padx=10, pady=10).pack(fill=tk.X, pady=(0, 15))
        
        tk.Button(padding_frame, text="🚀 하위 폴더까지 싹 다 정리하기", command=self.run_rename, bg="#44bd32", fg="white", font=("Arial", 11, "bold"), pady=8).pack(fill=tk.X)

    def select_folder(self):
        folder = filedialog.askdirectory(title="정리할 최상위 폴더를 선택하세요")
        if folder:
            self.target_path.set(folder)

    def run_rename(self):
        main_path = self.target_path.get()
        
        if not main_path:
            messagebox.showwarning("경고", "먼저 폴더를 선택해주세요!")
            return
            
        try:
            count = 0
            # topdown=False 옵션이 핵심입니다! 
            # 가장 안쪽 폴더부터 이름을 바꿔야 경로 꼬임이 없습니다.
            for root, dirs, files in os.walk(main_path, topdown=False):
                for name in dirs:
                    if ' ' in name:
                        # 띄어쓰기를 언더바로 교체
                        new_name = name.replace(' ', '_')
                        
                        old_full_path = os.path.join(root, name)
                        new_full_path = os.path.join(root, new_name)
                        
                        # 만약 이미 같은 이름의 폴더가 있다면? (중복 방지)
                        if os.path.exists(new_full_path):
                            # 이미 존재하면 뒤에 숫자를 붙여 보존
                            counter = 1
                            temp_name = new_name
                            while os.path.exists(os.path.join(root, f"{temp_name}_{counter}")):
                                counter += 1
                            new_full_path = os.path.join(root, f"{temp_name}_{counter}")
                        
                        # 이름 변경 실행
                        os.rename(old_full_path, new_full_path)
                        count += 1
            
            if count > 0:
                messagebox.showinfo("성공!", f"총 {count}개의 폴더 이름이 안전하게 정리되었습니다!")
            else:
                messagebox.showinfo("결과", "이름에 공백이 포함된 폴더가 없습니다.")
                
        except Exception as e:
            messagebox.showerror("에러 발생", f"작업 중 문제가 발생했습니다:\n{e}")

if __name__ == "__main__":
    root = tk.Tk()
    app = FolderRenameApp(root)
    root.mainloop()