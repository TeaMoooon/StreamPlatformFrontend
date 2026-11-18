import React, { Dispatch, SetStateAction, useRef, useState } from 'react';
// store
import { useDispatch } from 'react-redux';
import { AppDispatch } from '../../store/store';
import { loginUser, userProfile } from '../../store/actions/UserActions';
// formik
import { Formik, Form } from 'formik';
import { validationLogin } from '../../validation/validation';
// mui
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import { Box, FormControl, InputAdornment } from '@mui/material';
import {
  StyledButtonsForm,
  StyledIconButton,
  StyledInputLabel,
  StyledTextFieldOutlined,
  StyledTextFieldRegular,
  StyledFollowButton,
} from '../StylesComponents';
// types
import { IModalLoginForm } from '../../types/share';

const RATE_LIMIT_COOLDOWN_MS = 60_000;
const RATE_LIMIT_MESSAGE = 'Слишком много попыток. Подождите минуту и попробуйте снова.';

export const FormLogin = ({
  handleClose,
  setMessage,
}: {
  handleClose: () => void;
  setMessage: Dispatch<SetStateAction<string | null>>;
}) => {
  const dispatch = useDispatch<AppDispatch>();

  const [errorMessage, setErrorMessage] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const cooldownUntilRef = useRef(0);

  const handleClickShowPassword = () => setShowPassword((show) => !show);
  const handleMouseDownPassword = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
  };

  const handleMouseUpPassword = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
  };

  const checkUserAuth = async (values: IModalLoginForm) => {
    setMessage(null);

    if (Date.now() < cooldownUntilRef.current) {
      setErrorMessage(RATE_LIMIT_MESSAGE);
      return;
    }

    setErrorMessage('');
    const result = await loginUser({ loginOrEmail: values.loginOrEmail, password: values.password });
    if (result.ok) {
      cooldownUntilRef.current = 0;
      const profileResult = await dispatch(userProfile());
      if (!profileResult?.ok) {
        setErrorMessage('Не удалось загрузить профиль после входа.');
        return;
      }
      setMessage(null);
      handleClose();
      return;
    }

    if (result.status === 429) {
      cooldownUntilRef.current = Date.now() + RATE_LIMIT_COOLDOWN_MS;
      setErrorMessage(result.message || RATE_LIMIT_MESSAGE);
      return;
    }
    if (result.status === 403) {
      setErrorMessage(result.message || 'Аккаунт заблокирован');
      return;
    }
    // 401 = wrong credentials; do not leak whether the account exists.
    setErrorMessage(result.status === 401 ? 'Неверный логин или пароль.' : result.message || 'Не удалось войти.');
  };

  return (
    <Formik
      initialValues={{ loginOrEmail: '', password: '' }}
      enableReinitialize={false}
      validationSchema={validationLogin}
      onSubmit={checkUserAuth}
      autoComplete="on"
    >
      {({ values, handleChange, handleBlur, touched, errors }) => (
        <Form
          style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '20px', width: '100%' }}
        >
          <StyledTextFieldRegular
            label="Логин или электронная почта"
            onChange={handleChange}
            onBlur={handleBlur}
            value={values.loginOrEmail}
            error={touched.loginOrEmail && Boolean(errors.loginOrEmail)}
            helperText={touched.loginOrEmail && errors.loginOrEmail}
            name="loginOrEmail"
            autoComplete="username"
          />
          <FormControl variant="outlined" sx={{ width: '100%' }}>
            <StyledInputLabel htmlFor="outlined-adornment-password">Пароль</StyledInputLabel>
            <StyledTextFieldOutlined
              onChange={handleChange}
              onBlur={handleBlur}
              value={values.password}
              type={showPassword ? 'text' : 'password'}
              id="outlined-adornment-password"
              name="password"
              autoComplete="current-password"
              sx={{ borderRadius: '50px' }}
              endAdornment={
                <InputAdornment position="end">
                  <StyledIconButton
                    aria-label={showPassword ? 'hide the password' : 'display the password'}
                    onClick={handleClickShowPassword}
                    onMouseDown={handleMouseDownPassword}
                    onMouseUp={handleMouseUpPassword}
                    edge="end"
                  >
                    {showPassword ? <VisibilityOff /> : <Visibility />}
                  </StyledIconButton>
                </InputAdornment>
              }
              label="Password"
            />
            {touched.password && errors.password && (
              <Box sx={{ color: 'var(--error)', fontSize: '12px', marginTop: '4px' }}>{errors.password}</Box>
            )}
          </FormControl>
          {errorMessage && (
            <Box sx={{ color: 'var(--error)', fontSize: '14px', marginTop: '-10px' }}>{errorMessage}</Box>
          )}
          <StyledButtonsForm>
            <StyledFollowButton type="submit">Войти</StyledFollowButton>
          </StyledButtonsForm>
        </Form>
      )}
    </Formik>
  );
};
