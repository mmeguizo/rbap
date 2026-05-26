import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

/**
 * Rejects emails outside the CHMSU domain.
 * Lets Validators.required handle the empty case so error messages stay clean.
 */
export function chmsuEmailValidator(control: AbstractControl): ValidationErrors | null {
  const email = String(control.value ?? '')
    .trim()
    .toLowerCase();

  if (!email) {
    return null;
  }

  return email.endsWith('@chmsu.edu.ph') ? null : { chmsuDomain: true };
}

/**
 * Cross-field validator for matching values such as password + confirmPassword.
 */
export function matchingFieldsValidator(
  firstFieldName: string,
  secondFieldName: string,
  errorKey = 'fieldsMismatch',
): ValidatorFn {
  return (group: AbstractControl): ValidationErrors | null => {
    const firstValue = group.get(firstFieldName)?.value;
    const secondValue = group.get(secondFieldName)?.value;

    if (!firstValue || !secondValue) {
      return null;
    }

    return firstValue === secondValue ? null : { [errorKey]: true };
  };
}
