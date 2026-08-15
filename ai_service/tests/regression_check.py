import os
import subprocess
import sys
import json

def run_regression_test():
    print("--- MedEra AI v5.0: Regression Check ---")
    
    # Path to the stress test
    stress_test_path = os.path.join("scratch", "production_stress_test.py")
    
    if not os.path.exists(stress_test_path):
        print(f"Error: Stress test script not found at {stress_test_path}")
        return False
    
    # Run the stress test
    try:
        result = subprocess.run(
            [sys.executable, stress_test_path],
            capture_output=True,
            text=True
        )
        print(result.stdout)
        
        # Check if the verdict is success
        if "VERDICT PRODUCTION READINESS: OK" in result.stdout:
            print(">>> REGRESSION CHECK PASSED")
            return True
        else:
            print(">>> REGRESSION CHECK FAILED: Accuracy dropped below threshold!")
            return False
            
    except Exception as e:
        print(f"Error running regression test: {e}")
        return False

if __name__ == "__main__":
    success = run_regression_test()
    if not success:
        sys.exit(1)
    sys.exit(0)
