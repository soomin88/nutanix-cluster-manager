# Nutanix Cluster Manager - 다크사이트(폐쇄망) 설치 가이드

## 📦 배포 파일 목록

1. **NutanixClusterManager.exe** (17.8MB) - 실행파일
2. **offline-packages/** - Python 패키지 (28개 wheel 파일)
3. **requirements.txt** - 패키지 목록

## 🔧 설치 요구사항

### 1. Python 설치
- **Python 3.11 이상** (권장: Python 3.14)
- Windows x64 버전
- 설치 파일: `python-3.14.2-amd64.exe`
- 다운로드: https://www.python.org/downloads/

**설치 옵션:**
- ✅ "Add Python to PATH" 체크
- ✅ "Install for all users" 선택 (선택사항)

### 2. Microsoft Visual C++ Redistributable
- VC++ 2015-2022 Redistributable (x64)
- 대부분 Windows에 기본 설치되어 있음
- 필요시 다운로드: https://aka.ms/vs/17/release/vc_redist.x64.exe

## 📥 다크사이트 설치 절차

### 1단계: Python 설치
```cmd
# Python 설치 파일 실행
python-3.14.2-amd64.exe /quiet InstallAllUsers=1 PrependPath=1

# 또는 GUI로 설치
```

### 2단계: Python 패키지 오프라인 설치
```cmd
# 1. 배포 폴더로 이동
cd C:\nutanix-cluster-manager

# 2. 오프라인 패키지 설치
pip install --no-index --find-links=offline-packages -r requirements.txt
```

### 3단계: 실행
```cmd
# NutanixClusterManager.exe 더블클릭 또는
NutanixClusterManager.exe
```

## 🌐 네트워크 요구사항

### 필수
- **내부망 Nutanix 클러스터 접근**: https://[클러스터IP]:9440
- **localhost 포트 8000**: FastAPI 서버용

### 불필요
- ❌ 외부 인터넷 연결 불필요
- ❌ 외부 CDN/API 호출 없음

## 🔍 설치 확인

### Python 설치 확인
```cmd
python --version
# 출력: Python 3.14.2

pip --version
# 출력: pip 24.x.x from ...
```

### 패키지 설치 확인
```cmd
pip list | findstr "fastapi uvicorn"
# 출력:
# fastapi            0.128.0
# uvicorn            0.40.0
```

### 프로그램 실행 확인
1. `NutanixClusterManager.exe` 실행
2. 콘솔 창에서 다음 메시지 확인:
   - `INFO:     Uvicorn running on http://127.0.0.1:8000`
   - `INFO:     Application startup complete.`
3. 브라우저 자동 실행: http://localhost:8000

## 🐛 문제 해결

### "python314.dll을 찾을 수 없습니다"
- Python이 설치되지 않았거나 PATH에 없음
- 해결: Python 재설치, "Add to PATH" 체크

### "ModuleNotFoundError: No module named 'fastapi'"
- Python 패키지가 설치되지 않음
- 해결: 2단계(오프라인 설치) 재실행

### "포트 8000이 이미 사용 중입니다"
- 다른 프로그램이 8000 포트 사용 중
- 해결: `netstat -ano | findstr :8000`로 확인 후 프로세스 종료

## 📋 배포 체크리스트

인터넷 연결 가능한 환경에서 준비:
- [ ] Python 설치 파일 다운로드
- [ ] `pip download -r requirements.txt -d offline-packages` 실행
- [ ] NutanixClusterManager.exe 빌드
- [ ] VC++ Redistributable 다운로드 (선택)

다크사이트 환경으로 전달:
- [ ] Python 설치 파일
- [ ] NutanixClusterManager.exe
- [ ] offline-packages/ 폴더 (28개 .whl 파일)
- [ ] requirements.txt
- [ ] 본 설치 가이드

## 💡 추가 정보

- 프로그램 크기: 약 18MB (실행파일) + 7MB (패키지)
- 설치 시간: 약 5분
- Python 버전: 3.11+ (3.14 권장)
- 지원 OS: Windows 10/11, Windows Server 2016+
