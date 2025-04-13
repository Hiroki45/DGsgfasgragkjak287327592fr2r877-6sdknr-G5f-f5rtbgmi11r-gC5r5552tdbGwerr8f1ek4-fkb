    // !!! هام: استبدل هذا الرابط برابط Google Apps Script الخاص بك !!!
    const scriptURL = "https://script.google.com/macros/s/AKfycbzm8haqRANxu7k3Drf8kI5pJgUzUaFxt4eunnk763XbkmY5mfdGB7peGn-gZiQ5DDxC/exec"; // ضع الرابط الخاص بك هنا

    // --- *** NEW: Password *** ---
    // !!! مهم جداً: غيّر كلمة المرور هذه إلى كلمة مرور قوية وخاصة بك !!!
    const correctPassword = "1"; // <--- غيرها هنا
    // --- END Password ---

    const attendanceForm = document.forms["submit-attendance-to-google-sheet"];
    const studentListContainer = document.getElementById("student-list-container");
    // Ensure submitButton is selected only after the form is potentially visible
    let submitButton = null; // Initialize as null
    const mainContentDiv = document.getElementById('main-content'); // Get main content wrapper

    // --- Theme Toggle Elements ---
    const themeToggleButton = document.getElementById('theme-toggle-btn');
    const bodyElement = document.body;

    // --- Theme Functions (No changes needed here) ---
    const updateToggleButton = (theme) => {
        if (theme === 'light') {
            themeToggleButton.textContent = '🌙';
            themeToggleButton.setAttribute('aria-label', 'Switch to dark theme');
        } else {
            themeToggleButton.textContent = '☀️';
            themeToggleButton.setAttribute('aria-label', 'Switch to light theme');
        }
    };
    const applyTheme = (theme) => {
        bodyElement.dataset.theme = theme;
        localStorage.setItem('theme', theme);
        updateToggleButton(theme);
        console.log(`Theme applied: ${theme}`);
    };
    const toggleTheme = () => {
        const currentTheme = bodyElement.dataset.theme || 'dark';
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        applyTheme(newTheme);
    };
    const initializeTheme = () => {
        const savedTheme = localStorage.getItem('theme');
        const initialTheme = (savedTheme === 'light' || savedTheme === 'dark') ? savedTheme : 'dark';
        applyTheme(initialTheme);
    };
    themeToggleButton.addEventListener('click', toggleTheme);
    // --- End Theme Functions ---


    // --- *** NEW: Function to show main content and fetch students *** ---
    function showMainContentAndLoadStudents() {
      console.log("Password correct. Showing main content...");
      mainContentDiv.style.display = 'block';
      // Now that the form is visible, we can safely select the button
      submitButton = attendanceForm.querySelector('button[type="submit"]');
      fetchStudentList(); // Fetch students ONLY after password is correct
    }

     // --- *** NEW: Function to prompt for password *** ---
     function promptForPassword() {
        // Apply theme styles potentially before swal is called
        // Theme variables should be available globally
        swal({
            title: 'الرجاء إدخال كلمة المرور',
            input: 'password', // Input type password hides characters
            inputPlaceholder: 'كلمة المرور',
            inputAttributes: {
                autocapitalize: 'off',
                autocorrect: 'off'
            },
            allowOutsideClick: false, // Prevent closing by clicking outside
            allowEscapeKey: false,    // Prevent closing with Esc key
            showCancelButton: false, // Hide cancel button - must enter password
            confirmButtonText: 'دخول',
            inputValidator: (value) => {
                return new Promise((resolve) => {
                    if (value === correctPassword) {
                        resolve(); // Resolve with no error message means success
                    } else {
                        resolve('كلمة المرور غير صحيحة!'); // Resolve with error message
                    }
                })
            }
        }).then((result) => {
            // IMPORTANT: SweetAlert v7 resolves the promise even on validation failure.
            // We need to double-check the value *here*. The validator only controls the error message display.
            if (result.value === correctPassword) {
                showMainContentAndLoadStudents();
            } else {
                // User somehow managed to bypass the validator or submitted incorrectly.
                // Re-prompt or lock out. For simplicity, we just don't show content.
                console.error("Password validation failed or was bypassed.");
                // Optionally display a more permanent error on the page body
                document.body.innerHTML = `<div class="container"><div class="alert alert-danger text-center mt-5" role="alert" style="background-color: var(--error-color); color: var(--surface-color);">فشل التحقق من كلمة المرور. الرجاء تحديث الصفحة والمحاولة مرة أخرى.</div></div>`;
            }
        }).catch(error => {
            // This catch might trigger if swal itself fails, not typically for validation errors in v7
             console.error('SweetAlert error:', error);
             document.body.innerHTML = `<div class="container"><div class="alert alert-danger text-center mt-5" role="alert" style="background-color: var(--error-color); color: var(--surface-color);">حدث خطأ غير متوقع أثناء طلب كلمة المرور.</div></div>`;

        });
     }


    // --- Modified Student List Fetching ---
    async function fetchStudentList() {
      const url = `${scriptURL}?action=getStudents`;
      console.log("جاري جلب قائمة الطلاب من:", url);
      // Ensure submit button exists before trying to disable it
      if (submitButton) submitButton.disabled = true;
      studentListContainer.innerHTML = `
        <div class="loading-container">
           <div class="pulsing-loader">
              <span></span>
              <span></span>
              <span></span>
           </div>
           <div class="loading-text text-center">جاري تحميل قائمة الطلاب...</div>
        </div>`;


      try {
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error(`Network response was not ok: ${response.statusText} (Status ${response.status})`);
        }
        const data = await response.json();
        console.log("البيانات المستلمة:", data);
        if (data.result === "success" && Array.isArray(data.students)) {
          renderStudentList(data.students);
          if (submitButton) submitButton.disabled = (data.students.length === 0); // Disable if no students
        } else if (data.result === "error") {
          throw new Error(data.error || "فشل جلب قائمة الطلاب من السكريبت.");
        } else {
           if(data.result === "success" && !Array.isArray(data.students)){
               throw new Error("تم استلام بيانات الطلاب بصيغة غير متوقعة (ليست مصفوفة).");
           } else {
                throw new Error("تم استلام استجابة غير متوقعة أو غير صالحة من السكريبت.");
           }
        }
      } catch (error) {
        console.error("خطأ في جلب قائمة الطلاب!", error);
        displayError(`فشل تحميل قائمة الطلاب. تحقق من الرابط أو إعدادات الجدول.<br><small style="color: var(--secondary-text-color);">${error.message}</small>`);
        // Keep button disabled on error
        if (submitButton) submitButton.disabled = true;
      }
    }

    // --- Render Student List Function (Minor change for submit button state) ---
    function renderStudentList(students) {
        studentListContainer.innerHTML = "";
        if (!students || students.length === 0) {
            studentListContainer.innerHTML = '<p class="loading-message text-center p-3">لم يتم العثور على طلاب في المصدر المحدد (تأكد من وجود أسماء في العمود A ابتداءً من الصف الثاني في شيت الطلاب).</p>';
            if (submitButton) submitButton.disabled = true; // Disable if no students
            return;
        }
        students.forEach((student, index) => {
            const studentName = String(student || `طالب ${index + 1}`).trim();
            if (!studentName) return;

            const safeName = studentName.replace(/[^a-zA-Z0-9\u0600-\u06FF_]/g, "_");
            const elementId = `student_${index}_${safeName}`;
            const elementName = `student_${studentName}`; // Use original name for form data

            const div = document.createElement("div");
            div.className = "form-check";

            const label = document.createElement("label");
            label.className = "form-check-label";
            label.htmlFor = elementId;
            label.textContent = studentName;

            const input = document.createElement("input");
            input.className = "form-check-input";
            input.type = "checkbox";
            input.id = elementId;
            input.name = elementName; // Submit name and status
            input.value = "حاضر";     // Value if checked

             // Improved click handling (allows clicking anywhere in the row)
             div.addEventListener('click', (event) => {
                 // Prevent clicks on specific elements within from double-toggling
                 if (event.target !== input && event.target !== label) {
                    input.checked = !input.checked;
                    // Trigger change event if needed by other scripts (optional)
                    // input.dispatchEvent(new Event('change'));
                 }
             });


            div.appendChild(label); // Label first for semantic layout
            div.appendChild(input);


            studentListContainer.appendChild(div);
        });
         if (submitButton) submitButton.disabled = false; // Enable button now that students are listed
    }

    // --- Display Error Function (Ensure button is disabled) ---
    function displayError(message) {
       if (submitButton) submitButton.disabled = true; // Always disable on error
       studentListContainer.innerHTML = `<div class="error-message">${message}</div>`;
    }

    // --- Form Submission Event Listener (No changes needed) ---
    attendanceForm.addEventListener("submit", (e) => {
      e.preventDefault();

      // Double check button exists and isn't disabled
      if (!submitButton || submitButton.disabled) {
          console.warn("محاولة إرسال النموذج والزر معطل أو غير موجود.");
          return;
      }

      submitButton.disabled = true;
      submitButton.textContent = "جاري الإرسال...";

      const formData = new FormData(attendanceForm);

      // Collect *all* student names and their status (checked or not)
      const studentCheckboxes = attendanceForm.querySelectorAll('.form-check-input');
      const attendanceData = {};
      studentCheckboxes.forEach(cb => {
         // Use the name attribute (which should be the student's name) as the key
         // Remove "student_" prefix if added previously, ensure clean name
         // Correct approach: Send all names, checked ones have value "حاضر"
         // formData already captures checked boxes with their name and value.
         // We might want to explicitly add unchecked students if the script needs it.
         // For the provided script, just sending checked items is usually enough.
      });

      // Add the action parameter AFTER collecting student data
      formData.append('action', 'recordAttendance');

      // Logging formData content requires iterating (FormData isn't directly loggable)
      // for (let [key, value] of formData.entries()) {
      //     console.log(`Form Data: ${key}: ${value}`);
      // }


      fetch(scriptURL, { method: "POST", body: formData })
        .then((response) => {
            if (!response.ok) {
                return response.text().then(text => {
                    throw new Error(`استجابة الشبكة غير صالحة: ${response.statusText} (Status ${response.status}) - ${text}`);
                });
            }
             return response.json();
        })
        .then((data) => {
          console.log("استجابة الإرسال:", data);
          if (data.result === "success") {
            const successMsg = data.message || "تم تسجيل الحضور بنجاح.";
            swal({
              title: "تم بنجاح!",
              text: successMsg,
              type: "success",
              confirmButtonText: "موافق",
            });
             const checkboxes = attendanceForm.querySelectorAll('input[type="checkbox"]');
             checkboxes.forEach(cb => cb.checked = false);
          } else {
            const errorMsg = data.error || "فشل الإرسال. يرجى مراجعة السجلات أو الإعدادات.";
            swal("خطأ", errorMsg, "error");
          }
        })
        .catch((error) => {
          console.error("خطأ في الإرسال!", error);
          let errorDetails = "تعذر إرسال الحضور. يرجى التحقق من الاتصال بالإنترنت أو رابط السكريبت.";
          if(error.message){
              errorDetails += `\n\nتفاصيل الخطأ: ${error.message}`;
          }
           swal({
              title: "خطأ في الشبكة أو السكريبت",
              text: errorDetails,
              type: "error",
              confirmButtonText: "موافق"
           });
        })
        .finally(() => {
           // Re-enable button only if there are students listed
           const studentCheckboxesExist = studentListContainer.querySelector('.form-check-input');
           if(submitButton) { // Check if submitButton was successfully selected
               submitButton.disabled = !studentCheckboxesExist; // Disable if no checkboxes found
               submitButton.textContent = "إرسال الحضور";
           }
        });
    });

    // --- جميع الحقوق محفوظة لسليم ياسر سليم الزعبي ---
    document.addEventListener("DOMContentLoaded", () => {
        initializeTheme();       // Initialize theme first (so prompt is themed)
        promptForPassword();     // Ask for password BEFORE loading anything else
        // fetchStudentList(); // <-- This is now called from within password success
    });
