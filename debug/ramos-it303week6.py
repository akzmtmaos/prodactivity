
# Task 1 – Variables & Control Flow (Basic)
print("\nTASK 1: Variables & Control Flow")
print("-" * 30)

def task1_age_classifier():
    """Ask user for age and classify them based on age ranges"""
    try:
        age = int(input("Please enter your age: "))
        
        if age < 13:
            print("You are a child")
        elif age >= 13 and age <= 19:
            print("You are a teenager")
        elif age >= 20:
            print("You are an adult")
        else:
            print("Invalid age entered")
    except ValueError:
        print("Please enter a valid number for age")

# Task 2 – Functions & Loops (Intermediate)
print("\nTASK 2: Functions & Loops")
print("-" * 30)

def is_prime(n):
    """
    Check if a number is prime
    Returns True if n is prime, False otherwise
    """
    if n < 2:
        return False
    if n == 2:
        return True
    if n % 2 == 0:
        return False
    
    # Check odd numbers from 3 to square root of n
    for i in range(3, int(n ** 0.5) + 1, 2):
        if n % i == 0:
            return False
    return True

def task2_prime_checker():
    """Ask user for a number and check if it's prime"""
    try:
        number = int(input("Please enter a number to check if it's prime: "))
        
        if is_prime(number):
            print(f"{number} is a prime number")
        else:
            print(f"{number} is not a prime number")
    except ValueError:
        print("Please enter a valid number")

# Task 3 – Classes & Objects (Advanced)
print("\nTASK 3: Classes & Objects")
print("-" * 30)

class Student:
    """Student class with name, age, and grade attributes"""
    
    def __init__(self, name, age, grade):
        """Initialize student with name, age, and grade"""
        self.name = name
        self.age = age
        self.grade = grade
    
    def display_info(self):
        """Display student information"""
        print(f"Student Name: {self.name}")
        print(f"Age: {self.age}")
        print(f"Grade: {self.grade}")
        print("-" * 20)

def task3_student_objects():
    """Create and display information for two student objects"""
    # Create first student
    student1 = Student("John Doe", 18, "A")
    print("Student 1:")
    student1.display_info()
    
    # Create second student
    student2 = Student("Jane Smith", 16, "B+")
    print("Student 2:")
    student2.display_info()

# Main execution
if __name__ == "__main__":

    # Task 1

    print("TASK 1: Variables and Control Flow")
    print("="*50)
    task1_age_classifier()
    
    # Run Task 2

    print("RUNNING TASK 2: Prime Number Checker")
    print("="*50)
    task2_prime_checker()
    
    # Run Task 3

    print("RUNNING TASK 3: Student Objects")
    print("="*50)
    task3_student_objects()
    
